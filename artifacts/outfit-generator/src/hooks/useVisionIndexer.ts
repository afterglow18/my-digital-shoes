/**
 * useVisionIndexer — background hook that enriches existing and newly-added
 * photos with vision/color labels, staggered to avoid UI jank.
 *
 * Runs at most once per JS session (module-level guard).
 *
 * Version scheme
 * ──────────────
 *   0 → never analyzed
 *   1 → analyzed by native iOS Vision (correct — skip on all platforms)
 *       OR analyzed by old web code without background exclusion (wrong labels)
 *   2 → analyzed by old web code, got empty labels — retry with new threshold
 *   3 → analyzed by old web code (background-aware but tight black threshold)
 *   4 → analyzed by current web code (raised black threshold) — correct, skip
 *   5 → analyzed by current web code, truly empty labels — don't retry
 *
 * Eligible for (re-)indexing:
 *   • iOS  : visionVersion === 0 only (native Vision handles it; don't overwrite)
 *   • Web  : visionVersion 0–3 (anything produced by old code gets re-run)
 *            visionVersion 4 (current correct) and 5 (empty sentinel) are skipped.
 *
 * After analysis:
 *   • Got labels on web  → visionVersion = 4
 *   • Got labels on iOS  → visionVersion = 1
 *   • Empty labels       → visionVersion = 5  (stop retrying)
 *
 * New items added mid-session can be queued via queueItemForIndexing(); they
 * are processed immediately without waiting for the next app launch.
 * On analysis error the item keeps visionVersion === 0 for next-session retry.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { dbGetClothing, dbListClothing, dbUpdateClothing } from '@/lib/db';
import { analyzeImage } from '@/lib/visionAnalyzer';

/** ms between each photo — keeps the UI thread free. */
const DELAY_MS = 350;

/** Module-level guard: the background loop starts only once per JS session. */
let _loopStarted = false;

/** IDs queued for indexing during the current session. */
const _liveQueue: string[] = [];

/**
 * Resolve function for the current "wait for work" promise.
 * Called by queueItemForIndexing to wake the sleeping loop.
 */
let _wakeup: (() => void) | null = null;

/**
 * Queue a newly-added item for immediate vision indexing within this session.
 * Safe to call before the hook mounts — items are buffered and processed once
 * the loop is running.
 */
export function queueItemForIndexing(id: string): void {
  _liveQueue.push(id);
  _wakeup?.();
}

/** Returns true if item needs (re-)indexing on the current platform. */
function needsIndexing(item: { visionVersion?: number }): boolean {
  const v        = item.visionVersion ?? 0;
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    // iOS: only process items that have never been analyzed.
    return v === 0;
  }
  // Web: process anything analyzed by old code (0–3); skip current (4) and empty-sentinel (5+).
  return v <= 3;
}

/**
 * Analyze one item by ID and persist the results.
 * Returns true on success, false on failure (visionVersion stays 0 for retry).
 *
 * Exported for unit testing only — do not call from application code.
 */
export async function indexOne(id: string): Promise<boolean> {
  try {
    const item = await dbGetClothing(id);
    if (!item?.imageObjectPath) return false;
    // Skip if already sufficiently indexed on this platform.
    if (!needsIndexing(item)) return true;
    const isNative = Capacitor.isNativePlatform();
    const result   = await analyzeImage(item.imageObjectPath);
    await dbUpdateClothing(id, {
      visionLabels:  result.labels,
      visionText:    result.texts,
      visionVersion: result.labels.length > 0
        ? (isNative ? 1 : 4)  // 1 = iOS Vision, 4 = current web canvas
        : 5,                  // 5 = empty labels with current code, don't retry
    });
    return true;
  } catch {
    // Intentionally swallow — keeps visionVersion === 0 for next-session retry.
    return false;
  }
}

export function useVisionIndexer(): { isIndexing: boolean } {
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    if (_loopStarted) return;
    _loopStarted = true;

    let active = true;

    async function run() {
      // ── Phase 1: catch up on any unindexed items from previous sessions ──
      const items   = await dbListClothing();
      const pending = items.filter((i) => i.imageObjectPath && needsIndexing(i));

      if (pending.length > 0) {
        setIsIndexing(true);
        for (const item of pending) {
          if (!active) return;
          await indexOne(item.id);
          await new Promise<void>((r) => setTimeout(r, DELAY_MS));
        }
      }

      // ── Phase 2: live queue — stay active for the rest of the session ──
      while (active) {
        // Drain all currently buffered IDs.
        while (_liveQueue.length > 0) {
          const id = _liveQueue.shift()!;
          if (!active) return;
          setIsIndexing(true);
          await indexOne(id);
          await new Promise<void>((r) => setTimeout(r, DELAY_MS));
        }

        // Signal idle between bursts.
        if (active) setIsIndexing(false);

        // Sleep until queueItemForIndexing wakes us or the hook unmounts.
        await new Promise<void>((resolve) => {
          _wakeup = resolve;
        });
        _wakeup = null;
      }
    }

    run().catch(console.warn);

    return () => {
      active = false;
      // Wake the sleeping loop so it can exit the while(active) check cleanly.
      _wakeup?.();
    };
  }, []);

  return { isIndexing };
}
