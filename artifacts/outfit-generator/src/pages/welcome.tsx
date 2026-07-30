/**
 * WelcomePage — three-phase splash sequence, shown once per cold launch.
 *
 * PHASE 1 — HERO (auto, 2.5 s)
 *   Full-screen hero image + "Welcome to / My Digital Shoes" near the bottom.
 *   Fades out automatically after HERO_HOLD_MS.
 *
 * PHASE 2 — WELCOME
 *   Dark scene. Shoes slide onto the shelf automatically (no tap needed).
 *   Branding fades in near the bottom, ENTER button below it.
 *   Privacy Policy + Support links at the very bottom.
 *
 * PHASE 3 — EXITING
 *   Tap ENTER → whole screen fades out over EXIT_MS → onEnter() at ENTER_DELAY_MS.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "hero" | "welcome" | "exiting";

const HERO_HOLD_MS   = 2500;   // how long the hero image is fully visible
const HERO_FADE_MS   = 400;    // hero cross-fade duration
const EXIT_MS        = 650;    // full-screen fade-out on ENTER tap
const ENTER_DELAY_MS = 750;    // ms after tap before onEnter() fires

// Shoe shelf animation timings (unchanged from original)
const SLIDE_MS   = 480;
const STAGGER_MS = 130;

const SHOES = [
  { emoji: "👟", label: "Sneaker", dir: -1, stagger: 0 },
  { emoji: "👠", label: "Heel",    dir:  1, stagger: 1 },
  { emoji: "👢", label: "Boot",    dir: -1, stagger: 2 },
  { emoji: "🩴", label: "Sandal",  dir:  1, stagger: 3 },
];

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [phase, setPhase] = useState<Phase>("hero");
  const calledRef = useRef(false);

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  // Phase 1 → Phase 2 auto-advance
  useEffect(() => {
    const t = setTimeout(() => setPhase("welcome"), HERO_HOLD_MS);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 3 — ENTER tapped
  const handleEnter = useCallback(() => {
    if (phase !== "welcome") return;
    setPhase("exiting");
    setTimeout(finish, ENTER_DELAY_MS);
  }, [phase, finish]);

  // Shoes slide in automatically as soon as Phase 2 starts
  const shoesOnShelf = phase === "welcome" || phase === "exiting";

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#080808",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Ambient glow (always present) ───────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 35% at 50% 48%, rgba(80,70,60,0.18) 0%, transparent 70%)",
      }} />

      {/* ── PHASE 1 : Hero image ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "hero" && (
          <motion.div
            key="hero-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: HERO_FADE_MS / 1000, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
          >
            {/* Hero image */}
            <img
              src="/hero-splash.jpg"
              alt=""
              draggable={false}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center top",
                pointerEvents: "none",
              }}
            />

            {/* Dark gradient over lower portion for readability */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Branding near bottom */}
            <div style={{
              position: "absolute",
              bottom: "calc(env(safe-area-inset-bottom) + 64px)",
              left: 0, right: 0,
              textAlign: "center",
              padding: "0 24px",
            }}>
              <div style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: "clamp(20px, 6vw, 28px)",
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.75)",
                textShadow: "0 2px 10px rgba(0,0,0,0.80)",
                lineHeight: 1.4,
              }}>Welcome to</div>
              <div style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: "clamp(40px, 12vw, 56px)",
                color: "#f5f0e8",
                textShadow: "0 0 32px rgba(255,240,200,0.18), 0 2px 10px rgba(0,0,0,0.95)",
                lineHeight: 1.2,
              }}>My Digital Shoes</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 2 : Animated welcome screen ───────────────────────────────── */}
      <AnimatePresence>
        {(phase === "welcome" || phase === "exiting") && (
          <motion.div
            key="welcome-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
          >
            {/* Shoe shelf — auto-animates in */}
            <div style={{
              position: "absolute",
              top: "34%",
              left: 0, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center",
            }}>
              {/* Shoe row */}
              <div style={{
                display: "flex", flexDirection: "row",
                alignItems: "flex-end", justifyContent: "center",
                gap: "clamp(18px, 6vw, 36px)",
                paddingBottom: 10,
                width: "100%",
                overflow: "hidden",
              }}>
                {SHOES.map((shoe) => (
                  <motion.div
                    key={shoe.label}
                    initial={{ x: shoe.dir * 500, opacity: 0 }}
                    animate={shoesOnShelf ? { x: 0, opacity: 1 } : { x: shoe.dir * 500, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 24,
                      delay: shoe.stagger * (STAGGER_MS / 1000),
                    }}
                    style={{
                      fontSize: "clamp(44px, 11vw, 64px)",
                      lineHeight: 1,
                      filter: "brightness(0) invert(1) drop-shadow(0 6px 12px rgba(255,255,255,0.15))",
                    }}
                  >
                    {shoe.emoji}
                  </motion.div>
                ))}
              </div>

              {/* Shelf plank */}
              <div style={{
                width: "clamp(260px, 72vw, 380px)",
                height: 10,
                borderRadius: "5px 5px 3px 3px",
                background: "linear-gradient(to bottom, #ffffff, #e0e0e0)",
                boxShadow: "0 0 18px 4px rgba(255,255,255,0.55), 0 1px 0 rgba(255,255,255,0.9) inset",
              }} />
              {/* Glow underneath shelf */}
              <div style={{
                width: "clamp(200px, 60vw, 320px)",
                height: 14,
                borderRadius: "0 0 50% 50%",
                background: "radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, transparent 70%)",
                filter: "blur(6px)",
                marginTop: 2,
              }} />
            </div>

            {/* Branding + button — fade in slightly after shelf */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: (SLIDE_MS + STAGGER_MS * 3) / 1000, ease: "easeOut" }}
              style={{
                position: "absolute",
                bottom: "calc(env(safe-area-inset-bottom) + 64px)",
                left: 0, right: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 26,
              }}
            >
              {/* Branding */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Great Vibes', cursive",
                  fontSize: "clamp(20px, 6vw, 28px)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.80)",
                  textShadow: "0 2px 10px rgba(0,0,0,0.80)",
                  lineHeight: 1.4,
                }}>Welcome to</div>
                <div style={{
                  fontFamily: "'Great Vibes', cursive",
                  fontSize: "clamp(40px, 12vw, 56px)",
                  color: "#f5f0e8",
                  textShadow: "0 0 32px rgba(255,240,200,0.18), 0 2px 10px rgba(0,0,0,0.95)",
                  lineHeight: 1.2,
                }}>My Digital Shoes</div>
              </div>

              {/* Primary action button */}
              <button
                onClick={handleEnter}
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "#fff",
                  background: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.55)",
                  borderRadius: 40,
                  padding: "10px 28px",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                Enter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer links (always visible during splash) ──────────────────────── */}
      <div style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom) + 10px)",
        left: 0, right: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4, zIndex: 210,
      }}>
        <a
          href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.18)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Privacy Policy
        </a>
        <a
          href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.18)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Support
        </a>
      </div>
    </motion.div>
  );
}
