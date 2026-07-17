/**
 * WelcomePage — stiletto heel-drop animation.
 *
 * IDLE     : stiletto hangs above centre, title + pulsing "TAP TO ENTER".
 * DROPPING : heel falls under gravity to centre.
 * IMPACT   : ripple shockwave rings expand from heel point; subtle shake.
 * TITLE    : "Welcome to My Digital Shoes" rises in.
 * HERO     : hero image crossfades over the scene.
 * EXITING  : whole screen fades out → onEnter().
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "dropping" | "impact" | "title" | "hero" | "exiting";

const DROP_MS   = 680;
const IMPACT_MS = 850;
const TITLE_MS  = 480;
const HOLD_MS   = 1200;
const HERO_MS   = 750;
const EXIT_MS   = 600;

interface Props { onEnter: () => void; }

// ── Stiletto SVG — side view, toe left, spike drops down-right ──────────────
// ViewBox 0 0 240 300  (shoe body roughly top half, spike extends below)
const UPPER_PATH = `
  M 22 118
  C 18 96, 26 72, 50 56
  C 80 38, 140 30, 190 35
  C 210 38, 224 48, 226 62
  L 224 92
  C 218 98, 208 104, 198 107
  L 40 114
  C 32 114, 20 116, 22 118 Z
`;

// Thin heel spike from heel seat down
const SPIKE_PATH = `
  M 198 107
  C 202 110, 206 118, 208 132
  L 213 268
  L 219 267
  L 214 132
  C 212 118, 208 110, 204 107 Z
`;

// Toe cap accent
const TOE_CAP = `
  M 22 118
  C 16 110, 14 98, 18 88
  C 22 78, 34 70, 50 66
  C 36 76, 28 92, 26 106 Z
`;

// Sole strip (flat bottom of the shoe body)
const SOLE_PATH = `
  M 40 114 L 198 107 L 200 112 L 42 120 Z
`;

// Ripple ring radii
const RINGS = [28, 58, 95, 138];

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

    const t0 = DROP_MS;
    const t1 = t0 + IMPACT_MS;
    const t2 = t1 + TITLE_MS;
    const t3 = t2 + HOLD_MS;
    const t4 = t3 + HERO_MS;
    const t5 = t4 + EXIT_MS;

    setPhase("dropping");
    setTimeout(() => setPhase("impact"),  t0);
    setTimeout(() => setPhase("title"),   t1);
    setTimeout(() => setPhase("hero"),    t3);
    setTimeout(() => setPhase("exiting"), t4);
    setTimeout(finish,                    t5);
  }, [phase, finish]);

  const shoeVisible = phase !== "hero" && phase !== "exiting";
  const shoeDropped = phase === "impact" || phase === "title";

  // Spike tip screen-position for ripple origin (approximate centre-screen)
  const spikeScreenY = "58%";

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
      {/* Ambient radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 52%, rgba(80,70,90,0.22) 0%, transparent 70%)",
      }} />

      {/* ── Hero image (fades in during hero phase) ────────────────────────── */}
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

      {/* ── Stiletto (falls from above) ────────────────────────────────────── */}
      <AnimatePresence>
        {shoeVisible && (
          <motion.div
            key="shoe"
            initial={{ y: "-115%", rotate: -8 }}
            animate={
              phase === "dropping"
                ? { y: "-115%", rotate: -8 }          // still falling (keyframe handled below)
                : shoeDropped
                  ? { y: "-18%", rotate: 0 }           // landed
                  : { y: "-115%", rotate: -8 }         // idle — hangs above
            }
            transition={
              phase === "dropping"
                ? { y: { duration: DROP_MS / 1000, ease: [0.55, 0, 1, 0.45] },
                    rotate: { duration: DROP_MS / 1000, ease: "easeIn" } }
                : {}
            }
            style={{
              position: "absolute",
              top: 0, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              filter: "drop-shadow(0 20px 48px rgba(0,0,0,0.95)) drop-shadow(0 2px 6px rgba(255,255,255,0.04))",
            }}
          >
            <svg
              width={240} height={300}
              viewBox="0 0 240 300"
              fill="none"
            >
              {/* Spike */}
              <path d={SPIKE_PATH} fill="#1a1a1a" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              {/* Upper body */}
              <path d={UPPER_PATH} fill="#1e1e1e" stroke="rgba(255,255,255,0.20)" strokeWidth={1.5} />
              {/* Sole strip */}
              <path d={SOLE_PATH} fill="#111" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
              {/* Toe cap */}
              <path d={TOE_CAP} fill="#252525" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              {/* Subtle sheen line across vamp */}
              <path
                d="M 60 72 C 110 58, 170 52, 210 58"
                stroke="rgba(255,255,255,0.09)" strokeWidth={1.5}
                strokeLinecap="round" fill="none"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Falling shoe trigger (drives the actual drop motion) ───────────── */}
      <AnimatePresence>
        {phase === "dropping" && (
          <motion.div
            key="drop-driver"
            initial={{ y: "-115%" }}
            animate={{ y: "-18%" }}
            transition={{ duration: DROP_MS / 1000, ease: [0.55, 0, 1, 0.45] }}
            onAnimationComplete={() => {}}
            style={{ position: "absolute", top: 0, left: "50%", width: 240, height: 300,
                     pointerEvents: "none", opacity: 0, zIndex: -1 }}
          />
        )}
      </AnimatePresence>

      {/* ── Impact shockwave rings ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "impact" || phase === "title") && (
          <motion.div
            key="rings"
            style={{
              position: "absolute",
              top: spikeScreenY, left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 8, pointerEvents: "none",
            }}
          >
            {RINGS.map((r, i) => (
              <motion.div
                key={i}
                initial={{ width: 0, height: 0, opacity: 0.75, borderRadius: "50%" }}
                animate={{ width: r * 2, height: r * 2, opacity: 0 }}
                transition={{
                  duration: 0.9,
                  ease: "easeOut",
                  delay: i * 0.10,
                }}
                style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  border: "1.5px solid rgba(255,255,255,0.55)",
                  borderRadius: "50%",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Screen shake on impact ─────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "impact" && (
          <motion.div
            key="shake"
            animate={{ x: [0, -6, 5, -4, 3, -2, 1, 0], y: [0, 4, -3, 2, -1, 0] }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }}
          />
        )}
      </AnimatePresence>

      {/* ── App title ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "title" || phase === "hero") && (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TITLE_MS / 1000, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "22%",
              left: 0, right: 0,
              textAlign: "center",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(36px, 11vw, 54px)",
              color: "#f0f0f0",
              textShadow: "0 0 32px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.95)",
              lineHeight: 1.2,
            }}>
              Welcome to My Digital Shoes
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle state: wordmark + prompt ─────────────────────────────────── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="idle-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            style={{
              position: "absolute", bottom: "18%",
              left: 0, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 28,
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(36px, 11vw, 54px)",
              color: "#f0f0f0",
              textShadow: "0 0 32px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.95)",
              lineHeight: 1.2,
              textAlign: "center",
            }}>
              Welcome to My Digital Shoes
            </div>

            <motion.div
              animate={{ opacity: [0.35, 0.9, 0.35] }}
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
