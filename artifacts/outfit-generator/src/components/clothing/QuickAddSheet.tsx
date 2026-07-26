/**
 * QuickAddSheet
 *
 * Upload flow:
 *   pick ──(file chosen)──► encoding ──► preview ──(save)──► uploading ──► close
 *
 * Single photo: shows Original | Cleaned ✨ side-by-side comparison.
 * Multiple photos (gallery multi-select): batch-saves without comparison.
 */
import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Check, RotateCcw } from "lucide-react";
import { useCreateClothingItem, getListClothingQueryKey } from "@/hooks/useLocalWardrobe";
import type { ClothingItem } from "@/types/local";
import { useQueryClient } from "@tanstack/react-query";
import { removeBackground, blobToDataUrl, dataUrlToBlob } from "@/lib/backgroundRemoval";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "heels" | "sneakers" | "boots" | "sandals-flats";

const CATEGORY_LABELS: Record<Category, string> = {
  "heels":         "Heels",
  "sneakers":      "Sneakers",
  "boots":         "Boots",
  "sandals-flats": "Sandals + Flats",
};

type Phase = "pick" | "encoding" | "preview" | "uploading";

interface UploadProgress { done: number; total: number; label: string; }

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Compress a Blob to JPEG ≤ 2048px — the canonical encoding for upload. */
async function encodeForUpload(input: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(input);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 2048;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b && b.size > 1000 ? resolve(b) : reject(new Error("blank image"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("failed to load image"));
    };
    img.src = objectUrl;
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  category:      Category;
  existingCount: number;
  /** Called with the newly created item after a successful save. */
  onCreated?:    (item: ClothingItem) => void;
}

const PHOTO_TIPS = [
  "One shoe or a pair — both work great.",
  "Lay them flat on a plain background.",
  "Take the photo from directly above.",
  "Keep the shoe(s) fully in frame.",
] as const;

export function QuickAddSheet({ open, onOpenChange, category, existingCount, onCreated }: Props) {
  const [phase,        setPhase]        = useState<Phase>("pick");
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [progress,     setProgress]     = useState<UploadProgress | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [originalUrl,  setOriginalUrl]  = useState<string | null>(null);
  const [cleanedBlob,  setCleanedBlob]  = useState<Blob | null>(null);
  const [cleanedUrl,   setCleanedUrl]   = useState<string | null>(null);
  const [bgProcessing, setBgProcessing] = useState(false);
  const [bgFailed,     setBgFailed]     = useState(false);
  const [selected,     setSelected]     = useState<"original" | "cleaned">("original");

  // Bumped each time a new photo is picked — guards stale async results.
  const bgGenRef = useRef(0);

  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const createItem  = useCreateClothingItem();
  const queryClient = useQueryClient();

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    bgGenRef.current += 1;    // cancels any in-flight removal
    setBgProcessing(false);   // MUST reset — close can happen mid-removal
    setPhase("pick");
    setErrorMsg(null);
    setOriginalBlob(null);
    setOriginalUrl(null);
    setCleanedBlob(null);
    setCleanedUrl(null);
    setBgFailed(false);
    setSelected("original");
    setProgress(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Single-file flow (comparison UI) ──────────────────────────────────────

  const handleFile = useCallback(async (file: File | Blob) => {
    setErrorMsg(null);
    const myGen = ++bgGenRef.current;
    setOriginalBlob(null);
    setOriginalUrl(null);
    setCleanedBlob(null);
    setCleanedUrl(null);
    setBgFailed(false);
    setBgProcessing(false);
    setSelected("original");
    setPhase("encoding");

    // Encode to JPEG ≤ 2048px
    let jpeg: Blob;
    try {
      jpeg = await encodeForUpload(file);
    } catch (err) {
      if (bgGenRef.current !== myGen) return;
      setErrorMsg(`Could not read the photo: ${err instanceof Error ? err.message : String(err)}`);
      setPhase("pick");
      return;
    }
    if (bgGenRef.current !== myGen) return;

    // Show original, switch to comparison screen
    setOriginalBlob(jpeg);
    setOriginalUrl(URL.createObjectURL(jpeg));
    setPhase("preview");

    // Background removal — generation guard discards stale results
    setBgProcessing(true);
    try {
      const dataUrl    = await blobToDataUrl(jpeg);
      if (bgGenRef.current !== myGen) return;
      const resultUrl  = await removeBackground(dataUrl);
      if (bgGenRef.current !== myGen) return;
      const resultBlob    = await dataUrlToBlob(resultUrl);
      const resultObjUrl  = URL.createObjectURL(resultBlob);
      if (bgGenRef.current !== myGen) { URL.revokeObjectURL(resultObjUrl); return; }
      setCleanedBlob(resultBlob);
      setCleanedUrl(resultObjUrl);
      setSelected("cleaned");
    } catch (err) {
      if (bgGenRef.current !== myGen) return;
      console.warn("Background removal failed:", err);
      setBgFailed(true);
    } finally {
      if (bgGenRef.current === myGen) setBgProcessing(false);
    }
  }, []);

  // ── Save selected version ──────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const blob = selected === "cleaned" && cleanedBlob ? cleanedBlob : originalBlob;
    if (!blob) return;
    setPhase("uploading");
    try {
      const dataUrl  = await blobToDataUrl(blob);
      const label    = CATEGORY_LABELS[category];
      const n        = existingCount + 1;
      const autoName = n === 1 ? label : `${label} ${n}`;

      await new Promise<void>((resolve, reject) => {
        createItem.mutate(
          { data: { name: autoName, category, imageObjectPath: dataUrl } },
          {
            onSuccess: (createdItem) => {
              queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() });
              if (onCreated) onCreated(createdItem);
              resolve();
            },
            onError: reject,
          },
        );
      });
      handleClose();
    } catch (err) {
      setErrorMsg(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      setPhase("preview");
    }
  }, [selected, cleanedBlob, originalBlob, category, existingCount, createItem, queryClient, onCreated, handleClose]);

  // ── Multi-file batch flow (gallery multi-select, bg removal auto-applied) ──

  /**
   * Encode a file to JPEG, attempt bg removal, save to IndexedDB.
   * Falls back to original JPEG if removal fails — never blocks the batch.
   */
  const processAndSave = useCallback(async (
    file: File,
    countOffset: number,
    onStep: (label: string) => void,
  ): Promise<boolean> => {
    try {
      // 1. Encode to compact JPEG
      onStep("Preparing…");
      let jpeg: Blob;
      try {
        jpeg = await encodeForUpload(file);
      } catch {
        return false;
      }

      // 2. Attempt background removal — fall back gracefully
      let finalDataUrl: string;
      try {
        onStep("Removing background…");
        const rawDataUrl = await blobToDataUrl(jpeg);
        finalDataUrl = await removeBackground(rawDataUrl);
      } catch {
        finalDataUrl = await blobToDataUrl(jpeg);
      }

      // 3. Save to IndexedDB
      onStep("Saving…");
      const catLabel = CATEGORY_LABELS[category];
      const n        = existingCount + countOffset + 1;
      const autoName = n === 1 ? catLabel : `${catLabel} ${n}`;

      await new Promise<void>((resolve, reject) => {
        createItem.mutate(
          { data: { name: autoName, category, imageObjectPath: finalDataUrl } },
          {
            onSuccess: (createdItem) => {
              queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() });
              if (onCreated) onCreated(createdItem);
              resolve();
            },
            onError: reject,
          },
        );
      });
      return true;
    } catch {
      return false;
    }
  }, [category, existingCount, createItem, queryClient, onCreated]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (files.length === 1) {
      // Single file → comparison UI
      handleFile(files[0]);
      return;
    }
    // Multiple files → batch with auto bg removal
    setErrorMsg(null);
    setPhase("uploading");
    setProgress({ done: 0, total: files.length, label: "Starting…" });

    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      const ok = await processAndSave(files[i], i, (stepLabel) => {
        setProgress({ done: i, total: files.length, label: stepLabel });
      });
      if (ok) saved++;
      setProgress({ done: i + 1, total: files.length, label: "Done" });
    }

    if (saved === 0) {
      setErrorMsg("Could not save the photos. Please try again.");
      setPhase("pick");
      setProgress(null);
    } else {
      handleClose();
    }
  }, [handleFile, processAndSave, handleClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
    e.target.value = "";
  };

  if (!open) return null;

  const label = CATEGORY_LABELS[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 240 }}
      className="fixed inset-0 z-[70] flex flex-col max-w-md mx-auto bg-[#f9f4ee]"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pb-3 bg-white border-b-2 border-black flex-shrink-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <h2 className="font-display font-bold text-xl uppercase tracking-tight">
          Add {label}
        </h2>
        {(phase === "pick" || phase === "preview") && (
          <button
            onClick={handleClose}
            className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                       bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                       active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body — plain conditional divs, NO AnimatePresence (causes blank-screen flicker) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

        {/* ── PICK ── */}
        {phase === "pick" && (
          <div className="flex flex-col p-5 gap-5">
            {errorMsg && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8
                           border-4 border-black rounded-2xl
                           shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
                           active:translate-x-1 active:translate-y-1 active:shadow-none
                           transition-all"
                style={{ background: "linear-gradient(to bottom, #707070, #555555)" }}
              >
                <span className="text-4xl leading-none">📷</span>
                <span className="font-display font-bold text-base uppercase tracking-tight text-center leading-tight text-white">
                  Take<br />Photo
                </span>
              </button>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8
                           border-4 border-black rounded-2xl bg-white
                           shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
                           active:translate-x-1 active:translate-y-1 active:shadow-none
                           transition-all"
              >
                <span className="text-4xl leading-none">🖼️</span>
                <span className="font-display font-bold text-base uppercase tracking-tight text-center leading-tight">
                  Upload<br />Photo
                </span>
              </button>
            </div>

            <div className="border-2 border-black rounded-2xl bg-white p-4
                            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-display font-bold text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
                <span>📸</span> PHOTO TIPS
              </p>
              <ul className="flex flex-col gap-2">
                {PHOTO_TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-black/70 leading-snug">
                    <span className="mt-0.5 w-4 h-4 border-2 border-black rounded-sm
                                     flex items-center justify-center flex-shrink-0"
                      style={{ background: "#707070" }}>
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── ENCODING — full-screen spinner shown immediately after photo picked ── */}
        {phase === "encoding" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
            <div className="w-28 h-28 border-4 border-black rounded-3xl bg-white
                            flex items-center justify-center
                            shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl uppercase tracking-tight">Processing…</p>
              <p className="text-sm text-muted-foreground mt-1">Getting your photo ready.</p>
            </div>
          </div>
        )}

        {/* ── PREVIEW — side-by-side comparison ── */}
        {phase === "preview" && (
          <div className="flex flex-col gap-4 p-4">
            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}

            <p className="text-center font-bold text-[11px] uppercase tracking-widest opacity-40">
              {bgProcessing ? "Removing background…" : bgFailed ? "Background removal failed" : "Tap to choose"}
            </p>

            {/* Side-by-side cards */}
            <div className="flex gap-3">
              {/* Original */}
              <button
                onClick={() => setSelected("original")}
                className="flex-1 rounded-2xl overflow-hidden transition-all"
                style={{
                  border: selected === "original" ? "4px solid black" : "4px solid rgba(0,0,0,0.15)",
                  background: "none",
                  padding: 0,
                  opacity: selected === "original" ? 1 : 0.55,
                }}
              >
                <div style={{ background: "#111", minHeight: 176, position: "relative" }}>
                  {originalUrl && (
                    <img
                      src={originalUrl}
                      alt="Original"
                      style={{ width: "100%", objectFit: "contain", maxHeight: 176, display: "block" }}
                    />
                  )}
                  {selected === "original" && (
                    <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20,
                                  borderRadius: "50%", background: "black",
                                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-center font-bold text-[11px] uppercase py-1.5 m-0">Original</p>
              </button>

              {/* Cleaned */}
              <button
                onClick={() => cleanedUrl && setSelected("cleaned")}
                disabled={!cleanedUrl}
                className="flex-1 rounded-2xl overflow-hidden transition-all"
                style={{
                  border: selected === "cleaned" && cleanedUrl ? "4px solid black" : "4px solid rgba(0,0,0,0.15)",
                  background: "none",
                  padding: 0,
                  opacity: selected === "cleaned" && cleanedUrl ? 1 : 0.55,
                }}
              >
                {/* Checkerboard reveals transparency */}
                <div style={{
                  background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 12px 12px",
                  minHeight: 176,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {cleanedUrl ? (
                    <>
                      <img
                        src={cleanedUrl}
                        alt="Background removed"
                        style={{ width: "100%", objectFit: "contain", maxHeight: 176, display: "block" }}
                      />
                      {selected === "cleaned" && (
                        <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20,
                                      borderRadius: "50%", background: "black",
                                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </>
                  ) : bgFailed ? (
                    <p className="text-xs font-bold uppercase opacity-40 text-center px-3">
                      Could not remove background
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin opacity-40" />
                      <p className="text-xs font-bold uppercase opacity-50">Processing</p>
                    </div>
                  )}
                </div>
                <p className="text-center font-bold text-[11px] uppercase py-1.5 m-0">Cleaned ✨</p>
              </button>
            </div>

            {/* Action row */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setPhase("pick")}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           border-2 border-black bg-white font-bold text-sm uppercase tracking-wide
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                           active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleSave}
                disabled={bgProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                           border-2 border-black font-bold text-sm uppercase tracking-wide text-white
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                           active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: bgProcessing ? "#555" : "linear-gradient(to bottom, #1c1c1c, #0a0a0a)" }}
              >
                <Check className="w-4 h-4" />
                {bgProcessing ? "Processing…" : "Save to Closet"}
              </button>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {phase === "uploading" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
            <div className="w-28 h-28 border-4 border-black rounded-3xl bg-white
                            flex items-center justify-center
                            shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              {progress && progress.total > 1 ? (
                <>
                  <p className="font-display font-bold text-2xl uppercase tracking-tight">
                    Photo {Math.min(progress.done + 1, progress.total)} of {progress.total}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{progress.label}</p>
                  {/* Progress bar */}
                  <div className="mt-4 w-48 h-2 border-2 border-black rounded-full overflow-hidden bg-white mx-auto">
                    <div
                      className="h-full bg-black rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="font-display font-bold text-2xl uppercase tracking-tight">Saving…</p>
                  <p className="text-sm text-muted-foreground mt-1">Adding to your vanity.</p>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </motion.div>
  );
}
