/**
 * useVisionIndexer — background hook that enriches existing photos with
 * vision/color labels, staggered to avoid UI jank.
 *
 * Runs at most once per JS session (module-level guard).
 *
 * Version scheme
 * ──────────────
 *   0 → never analyzed
 *   1 → analyzed by native iOS Vision (correct — skip on all platforms)
 *       OR analyzed by old web code without background exclusion (wrong labels)
 *   2 → analyzed and got empty labels — don't retry
 *   3 → analyzed by new background-aware web canvas (correct — skip on web)
 *
 * Eligible for (re-)indexing:
 *   • iOS  : visionVersion === 0 only (native Vision handles it; don't overwrite)
 *   • Web  : visionVersion === 0 or visionVersion === 1
 *            (catches items labeled by the old broken code as well as unlabeled ones)
 *            visionVersion 2 (empty-label sentinel) and 3 (correct web) are skipped.
 *
 * After analysis:
 *   • Got labels on web  → visionVersion = 3
 *   • Got labels on iOS  → visionVersion = 1
 *   • Empty labels       → visionVersion = 2  (stop retrying)
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { dbListClothing, dbUpdateClothing } from '@/lib/db';
import { analyzeImage } from '@/lib/visionAnalyzer';

/** ms between each photo — keeps the UI thread free. */
const DELAY_MS = 350;

/** Module-level guard: indexing starts only once per JS session. */
let _indexingStarted = false;

export function useVisionIndexer(): { isIndexing: boolean } {
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    if (_indexingStarted) return;
    _indexingStarted = true;

    const isNative = Capacitor.isNativePlatform();
    let active = true;

    async function run() {
      const items = await dbListClothing();
      const pending = items.filter((i) => {
        if (!i.imageObjectPath) return false;
        const v = i.visionVersion ?? 0;
        if (isNative) {
          // On iOS: only process items that have never been analyzed.
          return v === 0;
        }
        // On web: process unanalyzed (0) and old-code items (1).
        // Skip empty-label sentinel (2) and correct web labels (3+).
        return v === 0 || v === 1;
      });

      if (pending.length === 0) return;
      setIsIndexing(true);

      for (const item of pending) {
        if (!active) break;
        try {
          const result = await analyzeImage(item.imageObjectPath!);
          if (!active) break;
          await dbUpdateClothing(item.id, {
            visionLabels:  result.labels,
            visionText:    result.texts,
            visionVersion: result.labels.length > 0
              ? (isNative ? 1 : 3)  // 1 = iOS Vision, 3 = background-aware web canvas
              : 2,                  // 2 = empty labels, don't retry
          });
        } catch {
          // One failure must not stop the whole queue.
        }
        await new Promise<void>((r) => setTimeout(r, DELAY_MS));
      }

      if (active) setIsIndexing(false);
    }

    run().catch(console.warn);
    return () => { active = false; };
  }, []);

  return { isIndexing };
}
