/**
 * visionAnalyzer.ts
 *
 * Thin TypeScript wrapper around the native VisionAnalyzerPlugin (Swift).
 * On non-iOS platforms (web dev) it returns empty arrays so callers degrade
 * gracefully and text-only search still works.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface VisionAnalyzerPlugin {
  analyze(options: {
    dataUrl: string;
    confidenceThreshold?: number;
  }): Promise<{ labels: string[]; texts: string[] }>;
}

const VisionAnalyzer = registerPlugin<VisionAnalyzerPlugin>('VisionAnalyzer');

/** True when running natively on iOS where Vision is available. */
export function isVisionAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Analyze a data-URL image with Apple Vision.
 * Returns { labels, texts } — always returns empty arrays on failure or on web.
 */
export async function analyzeImage(
  dataUrl: string,
): Promise<{ labels: string[]; texts: string[] }> {
  if (!isVisionAvailable() || !dataUrl) {
    return { labels: [], texts: [] };
  }
  try {
    return await VisionAnalyzer.analyze({ dataUrl, confidenceThreshold: 0.4 });
  } catch (err) {
    console.warn('[VisionAnalyzer] Analysis failed:', err);
    return { labels: [], texts: [] };
  }
}
