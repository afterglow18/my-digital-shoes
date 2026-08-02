/**
 * visionAnalyzer.ts
 *
 * On iOS: delegates to the native VisionAnalyzerPlugin (Apple Vision framework)
 * which returns classification labels + recognized text.
 *
 * On web / other platforms: falls back to canvas-based dominant-color extraction
 * so that color searches ("black", "white", "tan", etc.) still work in the browser
 * and during development.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface VisionAnalyzerPlugin {
  analyze(options: {
    dataUrl: string;
    confidenceThreshold?: number;
  }): Promise<{ labels: string[]; texts: string[] }>;
}

const VisionAnalyzer = registerPlugin<VisionAnalyzerPlugin>('VisionAnalyzer');

/** True when running natively on iOS where Apple Vision is available. */
export function isVisionAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Analyze a data-URL image.
 * On iOS: uses Apple Vision (classification + OCR) PLUS canvas color extraction,
 *         so color searches ("black", "white", etc.) work alongside object labels.
 * On web:  uses canvas pixel sampling to extract dominant color names.
 * Always resolves — never rejects.
 */
export async function analyzeImage(
  dataUrl: string,
): Promise<{ labels: string[]; texts: string[] }> {
  if (!dataUrl) return { labels: [], texts: [] };

  if (isVisionAvailable()) {
    try {
      // Run native Vision (object labels + OCR) and canvas colors in parallel.
      const [native, colorLabels] = await Promise.all([
        VisionAnalyzer.analyze({ dataUrl, confidenceThreshold: 0.4 }),
        extractColorsFromDataUrl(dataUrl),
      ]);
      // Merge: color labels first so color searches score higher, then object labels.
      const merged = [...new Set([...colorLabels, ...native.labels])];
      return { labels: merged, texts: native.texts };
    } catch (err) {
      console.warn('[VisionAnalyzer] Native analysis failed:', err);
      // Fall through to canvas-only path.
    }
  }

  // Web (or native fallback): canvas color extraction only.
  const labels = await extractColorsFromDataUrl(dataUrl);
  return { labels, texts: [] };
}

// ── Canvas color extraction ────────────────────────────────────────────────────

/**
 * Draws the image on a 48×48 canvas, detects the background color from the
 * four corner patches, then tallies only non-background / non-transparent
 * pixels so photographic backgrounds don't swamp the shoe's true color.
 *
 * Falls back to a full-image pass (no background exclusion) if background
 * exclusion removes everything — handles edge cases like a white shoe on a
 * white wall where the shoe and background share the same hue.
 */
function extractColorsFromDataUrl(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const SIZE = 48;
          const canvas = document.createElement('canvas');
          canvas.width  = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve([]); return; }
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

          // ── Step 1: estimate background color from corner 4×4 patches ──────
          const PATCH = 4;
          let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
          for (const [cx, cy] of [
            [0, 0], [SIZE - PATCH, 0],
            [0, SIZE - PATCH], [SIZE - PATCH, SIZE - PATCH],
          ] as [number, number][]) {
            for (let dy = 0; dy < PATCH; dy++) {
              for (let dx = 0; dx < PATCH; dx++) {
                const i = ((cy + dy) * SIZE + (cx + dx)) * 4;
                if (data[i + 3] < 64) continue; // transparent → skip
                bgR += data[i]; bgG += data[i + 1]; bgB += data[i + 2];
                bgCount++;
              }
            }
          }
          const hasBg = bgCount > 0;
          if (hasBg) { bgR /= bgCount; bgG /= bgCount; bgB /= bgCount; }

          // ── Step 2: tally foreground pixel colors ────────────────────────
          const tally = (excludeBg: boolean) => {
            const counts: Record<string, number> = {};
            let total = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
              if (a < 64) continue; // transparent → background removed
              if (excludeBg && hasBg) {
                // Manhattan distance per channel; ≤ 22 avg → likely background
                if (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) < 66) continue;
              }
              const name = rgbToColorName(r, g, b);
              counts[name] = (counts[name] ?? 0) + 1;
              total++;
            }
            return { counts, total };
          };

          let { counts, total } = tally(true);

          // If background exclusion removed everything, retry without it.
          if (total === 0) ({ counts, total } = tally(false));
          if (total === 0) { resolve([]); return; }

          const threshold = total * 0.10; // color must cover ≥ 10 % of foreground
          const colors = Object.entries(counts)
            .filter(([, c]) => c >= threshold)
            .sort(([, a], [, b]) => b - a)
            .map(([name]) => name);

          resolve(colors);
        } catch { resolve([]); }
      };
      img.onerror = () => resolve([]);
      img.src = dataUrl;
    } catch { resolve([]); }
  });
}

function rgbToColorName(r: number, g: number, b: number): string {
  const brightness  = (r * 299 + g * 587 + b * 114) / 1000;
  const saturation  = Math.max(r, g, b) - Math.min(r, g, b);

  // Near-achromatic shades — classify by brightness only.
  if (saturation < 35) {
    if (brightness < 80)  return 'black';   // raised: most "black" shoes are dark charcoal
    if (brightness < 110) return 'dark grey';
    if (brightness < 175) return 'grey';
    if (brightness < 225) return 'light grey';
    return 'white';
  }

  // Very dark saturated pixel → still call it black.
  if (brightness < 60) return 'black';

  const hue = rgbToHue(r, g, b);

  // Warm neutrals — beige / tan / brown before hue-based checks.
  if (hue >= 20 && hue < 55 && saturation < 90) {
    if (brightness > 185) return 'beige';
    if (brightness > 120) return 'tan';
    return 'brown';
  }

  if (hue < 20 || hue >= 345) return 'red';
  if (hue <  40)              return 'orange';
  if (hue <  65)              return 'yellow';
  if (hue < 155)              return 'green';
  if (hue < 190)              return 'teal';
  if (hue < 260)              return 'blue';
  if (hue < 290)              return 'purple';
  if (hue < 345)              return 'pink';
  return 'red';
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h: number;
  if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return h * 360;
}
