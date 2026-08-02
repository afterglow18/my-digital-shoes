/**
 * useVisionIndexer — background hook that processes existing photos with
 * Apple Vision once per session, in a staggered loop to avoid jank.
 *
 * Only runs on iOS (Vision unavailable elsewhere). Uses a module-level
 * flag so it's guaranteed to run at most once even if the hook mounts
 * multiple times.
 */
import { useEffect, useState } from 'react';
import { dbListClothing, dbUpdateClothing } from '@/lib/db';
import { analyzeImage, isVisionAvailable } from '@/lib/visionAnalyzer';

/** ms between indexing each photo — keeps the UI thread free. */
const DELAY_MS = 350;

/** Module-level guard: indexing starts only once per JS session. */
let _indexingStarted = false;

export function useVisionIndexer(): { isIndexing: boolean } {
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    if (_indexingStarted || !isVisionAvailable()) return;
    _indexingStarted = true;

    let active = true;

    async function run() {
      const items = await dbListClothing();
      const pending = items.filter(
        (i) => i.imageObjectPath && (!i.visionVersion || i.visionVersion < 1),
      );
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
            visionVersion: 1,
          });
        } catch {
          // Skip — don't let one failure stop the queue.
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
