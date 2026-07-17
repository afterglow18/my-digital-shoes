/**
 * WelcomePage — spotlight fashion show reveal.
 *
 * IDLE     : dark stage, shoe on pedestal barely visible, "TAP TO ENTER".
 * SWEEPING : spotlight cone sweeps in from the left across the stage.
 * CAUGHT   : spotlight locks on the shoe; it blazes into full light.
 * TITLE    : "My Digital Shoes" rises up from below like a runway reveal.
 * HERO     : hero image crossfades in.
 * EXITING  : screen fades out → onEnter().
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "sweeping" | "caught" | "title" | "hero" | "exiting";

const SWEEP_MS     = 950;
const CATCH_MS     = 180;
const TITLE_MS     = 380;
const HOLD_MS      = 500;
const HERO_MS      = 750;
const HERO_HOLD_MS = 900;
const EXIT_MS      = 600;

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

    const t0 = SWEEP_MS;
    const t1 = t0 + CATCH_MS;
    const t2 = t1 + TITLE_MS;
    const t3 = t2 + HOLD_MS;
    const t4 = t3 + HERO_MS + HERO_HOLD_MS;
    const t5 = t4 + EXIT_MS;

    setPhase("sweeping");
    setTimeout(() => setPhase("caught"),  t0);
    setTimeout(() => setPhase("title"),   t1);
    setTimeout(() => setPhase("hero"),    t3);
    setTimeout(() => setPhase("exiting"), t4);
    setTimeout(finish,                    t5);
  }, [phase, finish]);

  const isLit   = phase === "caught" || phase === "title" || phase === "hero";
  const hasTitle = phase === "title" || phase === "hero";
  const sweeping = phase === "sweeping";
  const spotlightActive = sweeping || isLit;

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        cursor: phase === "idle" ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* ── Hero image ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "hero" || phase === "exiting") && (
          <motion.img
            key="hero"
            src="/handbag-hero.jpg"
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Spotlight cone (sweeps from left, locks centre) ───────────────── */}
      <AnimatePresence>
        {spotlightActive && (
          <motion.div
            key="cone"
            initial={{ left: "-25%", opacity: 0.85 }}
            animate={
              isLit
                ? { left: "calc(50% - 130px)", opacity: 1 }
                : { left: "calc(50% - 130px)", opacity: 0.85 }
            }
            transition={{
              left:    { duration: SWEEP_MS / 1000, ease: [0.2, 0, 0.5, 1] },
              opacity: { duration: 0.2 },
            }}
            style={{
              position: "absolute",
              top: "-60px",
              width: 260,
              height: "72vh",
              clipPath: "polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)",
              background: "linear-gradient(to bottom, rgba(255,248,215,0.50) 0%, rgba(255,245,200,0.22) 35%, rgba(255,240,180,0.07) 70%, transparent 100%)",
              filter: "blur(14px)",
              pointerEvents: "none",
              zIndex: 6,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Halo glow on shoe when caught ────────────────────────────────── */}
      <AnimatePresence>
        {isLit && (
          <motion.div
            key="halo"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "31%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 180, height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,248,210,0.22) 0%, rgba(255,240,170,0.08) 55%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 7,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Floor pool of light ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isLit && (
          <motion.div
            key="floor"
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "54%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 160, height: 30,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,245,190,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 7,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Shoe on pedestal ─────────────────────────────────────────────── */}
      <motion.div
        animate={{ filter: isLit ? "brightness(1)" : "brightness(0.08)" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "30%",
          display: "flex", flexDirection: "column", alignItems: "center",
          zIndex: 10,
        }}
      >
        {/* Shoe emoji */}
        <div style={{ fontSize: 96, lineHeight: 1, filter: "drop-shadow(0 6px 18px rgba(255,240,180,0.35))" }}>
          👠
        </div>
        {/* Pedestal */}
        <div style={{
          marginTop: 6,
          width: 72, height: 10,
          borderRadius: "4px 4px 2px 2px",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
          boxShadow: isLit ? "0 2px 12px rgba(255,240,180,0.18)" : "none",
        }} />
        <div style={{
          width: 50, height: 5,
          background: "rgba(255,255,255,0.06)",
          borderRadius: "0 0 4px 4px",
        }} />
      </motion.div>

      {/* ── Title rises like a runway reveal ─────────────────────────────── */}
      <AnimatePresence>
        {hasTitle && (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TITLE_MS / 1000, ease: [0.2, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              top: "57%",
              left: 0, right: 0,
              textAlign: "center",
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <div style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(40px, 12vw, 58px)",
              color: "#f5f0e8",
              textShadow: "0 0 40px rgba(255,240,180,0.25), 0 2px 10px rgba(0,0,0,0.95)",
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
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 1 }}
            style={{
              position: "absolute",
              bottom: "18%",
              left: 0, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center",
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ opacity: [0.30, 0.80, 0.30] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.22em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.50)",
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
