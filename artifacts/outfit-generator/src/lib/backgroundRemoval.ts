import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

/**
 * Remove the background from a JPEG/PNG base64 data-URL.
 * Returns a PNG data-URL with transparent background.
 * On first ever call downloads ~15 MB ONNX model from imgly CDN (cached after that).
 * Throws on network error or unreadable image — callers should catch and fall back.
 *
 * Thread-safety fix (three parts):
 *
 * 1. Object.defineProperty locks ort.env.wasm.proxy = true with a no-op setter.
 *    @imgly/background-removal internally does `proxy = false` right before creating
 *    its inference session (it only enables the proxy when WebGPU is available, which
 *    iOS Safari/WKWebView doesn't support). The locked property silently ignores that
 *    write, keeping proxy true so ONNX Runtime runs inference in a sub-worker instead
 *    of blocking the main JS thread.
 *
 * 2. numThreads = 1 — iOS Safari has no SharedArrayBuffer, which WASM multithreading
 *    requires. Any value > 1 causes a silent crash. Single-threaded avoids it.
 *
 * 3. Dynamic import() — importing onnxruntime-web at module parse time triggers Vite's
 *    dependency pre-bundling mid-session, causing a full page reload that corrupts
 *    React's internal dispatcher. The dynamic import inside configureOrt() only fires
 *    the moment inference is first requested, after everything is stable.
 */

// Lazy singleton — resolved once, awaited by every subsequent call.
let ortConfigured: Promise<void> | null = null;

async function configureOrt(): Promise<void> {
  const ort = await import("onnxruntime-web");

  // Lock proxy = true so imgly's internal `proxy = false` write is silently ignored.
  Object.defineProperty(ort.env.wasm, "proxy", {
    get: () => true,
    set: () => {},   // no-op — blocks imgly from overriding back to false
    configurable: true,
  });

  // Single-threaded: iOS Safari has no SharedArrayBuffer for WASM multithreading.
  ort.env.wasm.numThreads = 1;
}

export async function removeBackground(dataUrl: string): Promise<string> {
  // Configure ORT exactly once; concurrent callers await the same promise.
  if (!ortConfigured) ortConfigured = configureOrt();
  await ortConfigured;

  const sourceBlob = await dataUrlToBlob(dataUrl);
  const resultBlob = await imglyRemoveBackground(sourceBlob, {
    model: "isnet_fp16",
    output: { format: "image/png", quality: 0.9 },
    // publicPath omitted → uses imgly CDN automatically
  });
  return blobToDataUrl(resultBlob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
