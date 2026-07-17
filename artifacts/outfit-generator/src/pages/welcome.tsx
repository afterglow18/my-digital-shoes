/**
 * WelcomePage — top-down sneaker with lace-tying animation.
 *
 * IDLE    : sneaker with loose lace ends; pulsing "Tap to lace up" prompt.
 * LACING  : loose ends retract to centre → bow strokes draw themselves in.
 * ZOOMING : whole shoe scales up (camera dives in).
 * HERO    : hero image crossfades.
 * EXITING : screen fades out → onEnter().
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "lacing" | "zooming" | "hero" | "exiting";

const LACE_MS = 650;
const BOW_MS  = 700;
const ZOOM_MS = 900;
const HERO_MS = 700;
const HOLD_MS = 1200;
const EXIT_MS = 620;

interface Props { onEnter: () => void; }

// ── Sneaker top-down geometry (220 × 300 canvas, ankle at top, toe at bottom)
const SHOE_PATH = `
  M 110 46 C 150 44 188 62 196 94
  L 200 220 C 200 258 170 288 110 290
  C 50 288 20 258 20 220
  L 24 94 C 32 62 70 44 110 46 Z
`;

// Centre tongue strip
const TONGUE_PATH = `
  M 84 55 L 136 55 L 136 210
  C 136 223 124 230 110 230
  C 96 230 84 223 84 210 Z
`;

// 5 eyelet row y-positions & paired x positions
const EY = [84, 114, 144, 172, 198];
const EL = [76, 72, 68, 64, 60];   // left eyelet x (spreading outward lower)
const ER = [144, 148, 152, 156, 160]; // right eyelet x

// Horizontal bar laces
const BARS = EY.map((y, i) => ({ d: `M ${EL[i]} ${y} L ${ER[i]} ${y}` }));

// Loose lace ends — curl from top eyelets outward/upward
const LOOSE_LEFT_D  = `M ${EL[0]} ${EY[0]} C 58 68, 36 54, 18 42`;
const LOOSE_RIGHT_D = `M ${ER[0]} ${EY[0]} C 162 68, 184 54, 202 42`;

// Bow parts — each is a separate path drawn via stroke-dashoffset
const BOW_LOOP_L = `M 110 80 C 98 72, 78 66, 70 72 C 60 80, 64 94, 78 96 C 92 98, 106 86, 110 80`;
const BOW_LOOP_R = `M 110 80 C 122 72, 142 66, 150 72 C 160 80, 156 94, 142 96 C 128 98, 114 86, 110 80`;
const BOW_KNOT   = `M 103 82 C 106 78, 114 78, 117 82 C 114 86, 106 86, 103 82`;
const BOW_TAIL_L = `M 105 86 C 98 96, 86 108, 78 118`;
const BOW_TAIL_R = `M 115 86 C 122 96, 134 108, 142 118`;

export default function WelcomePage({ onEnter }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const calledRef = useRef(false);

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleTap = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("lacing");

    // After lace ends retract + bow draws
    setTimeout(() => setPhase("zooming"), LACE_MS + BOW_MS + 120);
    // After zoom
    setTimeout(() => setPhase("hero"),    LACE_MS + BOW_MS + 120 + ZOOM_MS);
    // After hero hold
    setTimeout(() => setPhase("exiting"), LACE_MS + BOW_MS + 120 + ZOOM_MS + HOLD_MS);
    // Fire onEnter
    setTimeout(finish,                    LACE_MS + BOW_MS + 120 + ZOOM_MS + HOLD_MS + EXIT_MS);
  }, [phase, finish]);

  const isLacing  = phase === "lacing";
  const bowVisible = isLacing || phase === "zooming" || phase === "hero" || phase === "exiting";

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#0a0a0a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        cursor: phase === "idle" ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 40% at 50% 48%, rgba(60,60,80,0.28) 0%, transparent 70%)",
      }} />

      {/* Hero image (fades in during hero phase, sits behind shoe) */}
      <AnimatePresence>
        {(phase === "hero" || phase === "exiting") && (
          <motion.img
            key="hero"
            src="/handbag-hero.jpg"
            alt=""
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* Shoe + branding container */}
      <motion.div
        animate={
          phase === "zooming" || phase === "hero" || phase === "exiting"
            ? { scale: 6, opacity: phase === "exiting" ? 0 : 1 }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: ZOOM_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 20,
          position: "relative", zIndex: 10,
        }}
      >
        {/* ── App wordmark ────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: "clamp(34px, 10vw, 50px)",
            color: "#f0f0f0",
            textShadow: "0 0 24px rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.9)",
            lineHeight: 1.15,
          }}>
            Welcome to My Digital Shoes
          </div>
        </div>

        {/* ── Sneaker SVG ─────────────────────────────────────────────────── */}
        <motion.svg
          width={220} height={300}
          viewBox="0 0 220 300"
          fill="none"
          style={{
            filter:
              "drop-shadow(0 12px 32px rgba(0,0,0,0.85)) " +
              "drop-shadow(0 2px 8px rgba(255,255,255,0.04))",
          }}
        >
          {/* Outer shoe body */}
          <path d={SHOE_PATH} fill="#1c1c1c" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />

          {/* Tongue */}
          <path d={TONGUE_PATH} fill="#252525" stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} />

          {/* Stitching line down tongue centre */}
          <line x1={110} y1={60} x2={110} y2={220}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1}
            strokeDasharray="4 5" strokeLinecap="round" />

          {/* Bar laces */}
          {BARS.map((b, i) => (
            <path key={i} d={b.d}
              stroke="rgba(255,255,255,0.75)" strokeWidth={2.5} strokeLinecap="round" />
          ))}

          {/* Eyelets */}
          {EY.map((y, i) => (
            <g key={i}>
              <circle cx={EL[i]} cy={y} r={4.5} fill="#0a0a0a" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
              <circle cx={ER[i]} cy={y} r={4.5} fill="#0a0a0a" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
            </g>
          ))}

          {/* ── Loose lace ends (hidden once lacing starts) ───────────────── */}
          <motion.path
            d={LOOSE_LEFT_D}
            stroke="rgba(255,255,255,0.80)" strokeWidth={2.5} strokeLinecap="round" fill="none"
            animate={isLacing || bowVisible
              ? { opacity: 0, pathLength: 0 }
              : { opacity: 1, pathLength: 1 }}
            initial={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: LACE_MS / 1000, ease: "easeIn" }}
          />
          <motion.path
            d={LOOSE_RIGHT_D}
            stroke="rgba(255,255,255,0.80)" strokeWidth={2.5} strokeLinecap="round" fill="none"
            animate={isLacing || bowVisible
              ? { opacity: 0, pathLength: 0 }
              : { opacity: 1, pathLength: 1 }}
            initial={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: LACE_MS / 1000, ease: "easeIn" }}
          />

          {/* ── Bow (draws in after lace ends retract) ────────────────────── */}
          {bowVisible && (
            <>
              {/* Left bow loop */}
              <motion.path
                d={BOW_LOOP_L}
                stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} strokeLinecap="round" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: BOW_MS / 1000 * 0.6, ease: "easeOut", delay: 0.05 }}
              />
              {/* Right bow loop */}
              <motion.path
                d={BOW_LOOP_R}
                stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} strokeLinecap="round" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: BOW_MS / 1000 * 0.6, ease: "easeOut", delay: 0.12 }}
              />
              {/* Knot */}
              <motion.path
                d={BOW_KNOT}
                stroke="rgba(255,255,255,0.70)" strokeWidth={2} fill="rgba(255,255,255,0.15)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ transformOrigin: "110px 82px" }}
                transition={{ duration: 0.25, ease: "backOut", delay: BOW_MS / 1000 * 0.5 }}
              />
              {/* Left tail */}
              <motion.path
                d={BOW_TAIL_L}
                stroke="rgba(255,255,255,0.70)" strokeWidth={2.5} strokeLinecap="round" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: BOW_MS / 1000 * 0.4, ease: "easeOut", delay: BOW_MS / 1000 * 0.55 }}
              />
              {/* Right tail */}
              <motion.path
                d={BOW_TAIL_R}
                stroke="rgba(255,255,255,0.70)" strokeWidth={2.5} strokeLinecap="round" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: BOW_MS / 1000 * 0.4, ease: "easeOut", delay: BOW_MS / 1000 * 0.55 }}
              />
            </>
          )}
        </motion.svg>
      </motion.div>

      {/* ── "Tap to lace up" prompt (idle only) ─────────────────────────────── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 0.4 },
            }}
            style={{
              position: "absolute", bottom: "15%",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.40)",
              pointerEvents: "none",
            }}
          >
            TAP TO ENTER
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom) + 10px)",
        left: 0, right: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4, zIndex: 210,
        pointerEvents: "none",
      }}>
        <a href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
          target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.18)",
            textDecoration: "none", letterSpacing: "0.02em", pointerEvents: "auto",
          }}>
          Privacy Policy
        </a>
        <a href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.18)",
            textDecoration: "none", letterSpacing: "0.02em", pointerEvents: "auto",
          }}>
          Support
        </a>
      </div>
    </motion.div>
  );
}
