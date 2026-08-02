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
 * On iOS: uses Apple Vision (classification + OCR).
 * On web:  uses canvas pixel sampling to extract dominant color names.
 * Always resolves — never rejects.
 */
export async function analyzeImage(
  dataUrl: string,
): Promise<{ labels: string[]; texts: string[] }> {
  if (!dataUrl) return { labels: [], texts: [] };

  if (isVisionAvailable()) {
    try {
      return await VisionAnalyzer.analyze({ dataUrl, confidenceThreshold: 0.4 });
    } catch (err) {
      console.warn('[VisionAnalyzer] Native analysis failed:', err);
      return { labels: [], texts: [] };
    }
  }

  // Web fallback: canvas color extraction.
  const labels = await extractColorsFromDataUrl(dataUrl);
  return { labels, texts: [] };
}

// ── Canvas color extraction ────────────────────────────────────────────────────

/**
 * Draws the image on a small canvas, samples every pixel, and returns the
 * dominant color names (those covering ≥ 15 % of non-transparent pixels).
 */
function extractColorsFromDataUrl(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const SIZE = 32; // 32×32 is plenty for color profiling
          const canvas = document.createElement('canvas');
          canvas.width  = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve([]); return; }
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

          const counts: Record<string, number> = {};
          let total = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 64) continue; // ignore mostly-transparent pixels
            const name = rgbToColorName(r, g, b);
            counts[name] = (counts[name] ?? 0) + 1;
            total++;
          }

          if (total === 0) { resolve([]); return; }

          const threshold = total * 0.12; // must cover ≥ 12 % of pixels
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
    if (brightness < 45)  return 'black';
    if (brightness < 110) return 'dark grey';
    if (brightness < 175) return 'grey';
    if (brightness < 225) return 'light grey';
    return 'white';
  }

  // Very dark saturated pixel → still call it black.
  if (brightness < 35) return 'black';

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
