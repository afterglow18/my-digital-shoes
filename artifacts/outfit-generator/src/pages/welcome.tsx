/**
 * WelcomePage — catwalk strut animation.
 *
 * IDLE    : side-on stiletto at left edge; pulsing "TAP TO ENTER".
 * WALKING : shoe strides across screen left → right with step bounce;
 *           glittery footprint marks appear in its wake.
 * TYPING  : "My Digital Shoes" types itself out letter by letter.
 * HERO    : hero image crossfades over the scene.
 * EXITING : screen fades out → onEnter().
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "walking" | "typing" | "hero" | "exiting";

const WALK_MS  = 2400;
const TYPE_MS  = 1600;   // total time for all chars to type
const HOLD_MS  = 900;
const HERO_MS  = 750;
const EXIT_MS  = 600;

const TITLE = "My Digital Shoes";

// Footprint x positions as % of screen width, triggered as shoe passes
const FOOTPRINTS: { x: number; delay: number }[] = [
  { x: 12,  delay: WALK_MS * 0.14 },
  { x: 24,  delay: WALK_MS * 0.26 },
  { x: 36,  delay: WALK_MS * 0.38 },
  { x: 48,  delay: WALK_MS * 0.50 },
  { x: 60,  delay: WALK_MS * 0.62 },
  { x: 72,  delay: WALK_MS * 0.74 },
  { x: 84,  delay: WALK_MS * 0.86 },
];

interface Props { onEnter: () => void; }

// ── Stiletto SVG — right-facing side view (toe → right, spike → down-left) ──
// ViewBox 0 0 130 90
const UPPER = `
  M 10 60
  C 8 46, 12 30, 26 20
  C 48 8, 88 4, 116 12
  C 124 15, 128 22, 126 32
  C 123 40, 115 46, 106 48
  L 26 54
  C 18 54, 10 58, 10 60 Z
`;
const SPIKE = `
  M 12 58
  C 10 62, 8 68, 6 78
  L 8 84 L 13 83
  L 12 73
  C 13 66, 15 61, 15 58 Z
`;
const TOE_CAP = `
  M 106 48
  C 118 46, 126 40, 126 32
  C 126 24, 120 16, 112 14
  C 118 20, 122 30, 120 40 Z
`;
const SHEEN = `M 30 26 C 60 16, 95 12, 118 18`;

export default function WelcomePage({ onEnter }: Props) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [visibleChars, setVisibleChars] = useState(0);
  const [activeFootprints, setActiveFootprints] = useState<number[]>([]);
  const calledRef  = useRef(false);
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleTap = useCallback(() => {
    if (phase !== "idle") return;

    setPhase("walking");

    const add = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    // Footprints appear as shoe walks past
    FOOTPRINTS.forEach((fp, i) => {
      add(() => setActiveFootprints(prev => [...prev, i]), fp.delay);
    });

    // Shoe finishes → start typing
    add(() => setPhase("typing"), WALK_MS);

    // Type each character
    for (let i = 1; i <= TITLE.length; i++) {
      const delay = WALK_MS + (i / TITLE.length) * TYPE_MS;
      add(() => setVisibleChars(i), delay);
    }

    // Show hero
    add(() => setPhase("hero"),    WALK_MS + TYPE_MS + HOLD_MS);
    // Exit
    add(() => setPhase("exiting"), WALK_MS + TYPE_MS + HOLD_MS + HERO_MS);
    add(finish,                    WALK_MS + TYPE_MS + HOLD_MS + HERO_MS + EXIT_MS);
  }, [phase, finish]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  // Y keyframes simulate steps: 5 strides across the screen
  const stepY   = [0, -16, 0, -16, 0, -16, 0, -16, 0, -14, 0];
  const stepRot = [0,  -4, 0,  -4, 0,  -4, 0,  -4, 0,  -3, 0];

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#080808",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        cursor: phase === "idle" ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* Catwalk floor line */}
      <div style={{
        position: "absolute",
        top: "62%", left: "5%", right: "5%",
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)",
        pointerEvents: "none",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 40% at 50% 62%, rgba(70,60,80,0.20) 0%, transparent 70%)",
      }} />

      {/* ── Hero image ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "hero" || phase === "exiting") && (
          <motion.img
            key="hero"
            src="/handbag-hero.jpg"
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Footprints ──────────────────────────────────────────────────────── */}
      {FOOTPRINTS.map((fp, i) => (
        <AnimatePresence key={i}>
          {activeFootprints.includes(i) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.7, 0.4], scale: [0.5, 1, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: `${fp.x}%`,
                top: "62%",
                transform: "translate(-50%, -50%)",
                zIndex: 6,
                pointerEvents: "none",
                display: "flex", flexDirection: "column", gap: 3, alignItems: "center",
              }}
            >
              {/* Heel print */}
              <div style={{
                width: 5, height: 8, borderRadius: "50%",
                background: "rgba(255,255,255,0.45)",
                boxShadow: "0 0 6px rgba(255,255,255,0.6)",
              }} />
              {/* Toe print */}
              <div style={{
                width: 10, height: 6, borderRadius: "50%",
                background: "rgba(255,255,255,0.30)",
                boxShadow: "0 0 4px rgba(255,255,255,0.4)",
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      {/* ── Walking shoe ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "idle" || phase === "walking") && (
          <motion.div
            key="shoe"
            initial={{ x: "-60vw" }}
            animate={
              phase === "walking"
                ? {
                    x: "110vw",
                    y: stepY,
                    rotate: stepRot,
                  }
                : { x: "-12vw", y: 0, rotate: 0 }
            }
            transition={
              phase === "walking"
                ? {
                    x:      { duration: WALK_MS / 1000, ease: "linear" },
                    y:      { duration: WALK_MS / 1000, ease: "linear", times: stepY.map((_, i) => i / (stepY.length - 1)) },
                    rotate: { duration: WALK_MS / 1000, ease: "linear", times: stepRot.map((_, i) => i / (stepRot.length - 1)) },
                  }
                : { duration: 0.6, ease: "easeOut" }
            }
            style={{
              position: "absolute",
              top: "53%",
              zIndex: 10,
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.90)) drop-shadow(0 2px 4px rgba(255,255,255,0.05))",
            }}
          >
            <svg width={130} height={90} viewBox="0 0 130 90" fill="none">
              <path d={SPIKE}    fill="#e8e8e8" stroke="rgba(255,255,255,0.60)" strokeWidth={1} />
              <path d={UPPER}    fill="#f0f0f0" stroke="rgba(255,255,255,0.90)" strokeWidth={1.5} />
              <path d={TOE_CAP}  fill="#d8d8d8" stroke="rgba(255,255,255,0.50)" strokeWidth={1} />
              <path d={SHEEN}    stroke="rgba(255,255,255,0.60)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Typed title ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "typing" || phase === "hero") && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: "28%",
              left: 0, right: 0,
              textAlign: "center",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(40px, 12vw, 58px)",
              color: "#f0f0f0",
              textShadow: "0 0 32px rgba(255,255,255,0.14), 0 2px 10px rgba(0,0,0,0.95)",
              lineHeight: 1.2,
              letterSpacing: "0.01em",
            }}>
              {TITLE.slice(0, visibleChars)}
              {/* Blinking cursor while typing */}
              {visibleChars < TITLE.length && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ color: "rgba(255,255,255,0.5)", marginLeft: 1 }}
                >|</motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle state: wordmark + TAP TO ENTER ─────────────────────────────── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="idle-ui"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "28%",
              left: 0, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 24,
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(40px, 12vw, 58px)",
              color: "#f0f0f0",
              textShadow: "0 0 32px rgba(255,255,255,0.14), 0 2px 10px rgba(0,0,0,0.95)",
              lineHeight: 1.2,
              textAlign: "center",
            }}>
              My Digital Shoes
            </div>

            <motion.div
              animate={{ opacity: [0.35, 0.90, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.22em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
              }}
            >
              TAP TO ENTER
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer links ───────────────────────────────────────────────────── */}
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
