/**
 * useVisionIndexer — background hook that enriches existing photos with
 * vision/color labels, staggered to avoid UI jank.
 *
 * Runs at most once per JS session (module-level guard).
 *
 * Items eligible for (re-)indexing:
 *   • visionVersion === 0  → never analyzed.
 *   • visionVersion === 1 AND visionLabels is empty → analyzed before the
 *     web color-extraction fallback existed; needs a fresh pass.
 *
 * After a successful analysis that yields labels, visionVersion is set to 1.
 * After a successful analysis that still yields no labels (e.g. blank image),
 * visionVersion is set to 2 so the item is not retried endlessly.
 */
import { useEffect, useState } from 'react';
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

    let active = true;

    async function run() {
      const items = await dbListClothing();
      const pending = items.filter((i) => {
        if (!i.imageObjectPath) return false;
        const v      = i.visionVersion ?? 0;
        const noLabels = (i.visionLabels?.length ?? 0) === 0;
        // v === 0 → never analyzed.
        // v === 1 + empty labels → old web-only pass; needs color extraction.
        // v >= 2 → either has labels or was already retried → skip.
        return v === 0 || (v === 1 && noLabels);
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
            // v=1 if we got labels; v=2 if still empty (stops future retries).
            visionVersion: result.labels.length > 0 ? 1 : 2,
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
