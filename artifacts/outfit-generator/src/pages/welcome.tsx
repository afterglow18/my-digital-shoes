/**
 * WelcomePage — stiletto heel-drop animation (emoji).
 *
 * IDLE     : 👠 hangs above centre; "My Digital Shoes" + pulsing "TAP TO ENTER".
 * DROPPING : emoji falls under gravity to centre of screen.
 * IMPACT   : ripple shockwave rings expand; subtle screen shake.
 * TITLE    : title rises in below the shoe.
 * HERO     : hero image crossfades over the scene.
 * EXITING  : screen fades out → onEnter().
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "dropping" | "impact" | "title" | "hero" | "exiting";

const DROP_MS   = 650;
const IMPACT_MS = 850;
const TITLE_MS  = 450;
const HOLD_MS   = 1100;
const HERO_MS   = 750;
const EXIT_MS   = 600;

const RINGS = [30, 65, 108, 158];

interface Props { onEnter: () => void; }

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

  const landed = phase === "impact" || phase === "title";

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
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 48%, rgba(80,65,95,0.20) 0%, transparent 70%)",
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

      {/* ── Falling / landed emoji ─────────────────────────────────────────── */}
      <AnimatePresence>
        {phase !== "hero" && phase !== "exiting" && (
          <motion.div
            key="shoe"
            initial={{ y: "-130%", rotate: -20, scale: 1 }}
            animate={
              phase === "dropping"
                ? { y: "0%",    rotate: 0,  scale: 1   }
                : landed
                  ? { y: "0%",  rotate: 0,  scale: 1   }
                  : { y: "-130%", rotate: -20, scale: 1 }
            }
            transition={
              phase === "dropping"
                ? { duration: DROP_MS / 1000, ease: [0.4, 0, 1, 0.6] }
                : { duration: 0 }
            }
            style={{
              position: "absolute",
              top: "24%",
              fontSize: 96,
              lineHeight: 1,
              zIndex: 10,
              filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.9))",
            }}
          >
            👠
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shockwave rings ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "impact" || phase === "title") && (
          <motion.div
            key="rings"
            style={{
              position: "absolute",
              top: "37%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 8, pointerEvents: "none",
            }}
          >
            {RINGS.map((r, i) => (
              <motion.div
                key={i}
                initial={{ width: 0, height: 0, opacity: 0.8 }}
                animate={{ width: r * 2, height: r * 2, opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeOut", delay: i * 0.09 }}
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

      {/* ── Screen shake ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "impact" && (
          <motion.div
            key="shake"
            animate={{ x: [0, -7, 6, -4, 3, -1, 0], y: [0, 5, -3, 2, -1, 0] }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }}
          />
        )}
      </AnimatePresence>

      {/* ── Title (rises in after impact) ────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "title" || phase === "hero") && (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TITLE_MS / 1000, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "52%",
              left: 0, right: 0,
              textAlign: "center",
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(40px, 12vw, 58px)",
              color: "#f0f0f0",
              textShadow: "0 0 32px rgba(255,255,255,0.14), 0 2px 10px rgba(0,0,0,0.95)",
              lineHeight: 1.2,
            }}>
              My Digital Shoes
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle state ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="idle-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.8 }}
            style={{
              position: "absolute",
              top: "52%",
              left: 0, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 28,
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
