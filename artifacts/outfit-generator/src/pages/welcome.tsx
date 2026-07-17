/**
 * WelcomePage — Stiletto heel walks left → right, pauses, steps down,
 * "My Digital Shoes" fades in, then transitions into the app.
 * Auto-plays — no tap required.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ── Timing ────────────────────────────────────────────────────────────────────
const WALK_MS  = 1900;   // heel walks from off-screen left to centre
const PAUSE_MS = 460;    // brief pause at centre
const STEP_MS  = 380;    // heel steps down
const HOLD_MS  = 1200;   // hold with logo visible
const EXIT_MS  = 580;    // fade to app

interface Props { onEnter: () => void; }

// ── Stiletto heel SVG (side-view, facing right) ───────────────────────────────
// 200 × 148 viewBox. Thin heel post on left, pointed toe on right.
const HEEL_PATH = `
  M 22 132
  L 36 132
  L 38 88
  C 48 87 85 88 125 87
  C 148 86 166 82 174 76
  C 177 72 178 65 176 57
  C 174 49 167 38 156 30
  C 140 19 112 12 86 11
  C 66 10 48 15 36 24
  C 24 34 18 48 16 62
  C 15 74 15 84 18 88
  L 20 88
  Z
`;

const HEEL_HIGHLIGHT = "M 36 24 C 58 13 112 10 152 28";
const HEEL_SOLE_CREASE = "M 38 88 C 70 86 130 87 174 76";

export default function WelcomePage({ onEnter }: Props) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [exiting,     setExiting]     = useState(false);
  const [shadowReady, setShadowReady] = useState(false);
  const calledRef = useRef(false);

  const heelCtrl   = useAnimation();
  const shadowCtrl = useAnimation();

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // ── 1. Walk in from left to centre ──────────────────────────────────
      // Y keyframes create a 4-step walking bob
      await heelCtrl.start({
        x: 0,
        y: [0, -14, 0, -14, 0, -14, 0, -12, 0],
        rotate: [-3, -1, -3, -1, -3, -1, -3, -1, 0],
        transition: {
          x:      { duration: WALK_MS / 1000, ease: [0.2, 0, 0.6, 1] },
          y:      { duration: WALK_MS / 1000, times: [0, .12, .25, .37, .5, .62, .75, .87, 1], ease: "easeInOut" },
          rotate: { duration: WALK_MS / 1000, times: [0, .12, .25, .37, .5, .62, .75, .87, 1] },
        },
      });

      if (cancelled) return;

      // ── 2. Pause at centre ───────────────────────────────────────────────
      await new Promise(r => setTimeout(r, PAUSE_MS));
      if (cancelled) return;

      // ── 3. Step down — heel drops to "floor" with a small bounce ────────
      await heelCtrl.start({
        y: [0, -10, 6, 0],
        rotate: [0, -4, 3, 2],
        transition: { duration: STEP_MS / 1000, ease: "easeOut" },
      });

      if (cancelled) return;
      setShadowReady(true);
      shadowCtrl.start({ opacity: 0.45, scaleX: 1, transition: { duration: 0.25 } });

      // ── 4. Logo fades in ─────────────────────────────────────────────────
      setLogoVisible(true);

      // ── 5. Hold, then exit ───────────────────────────────────────────────
      await new Promise(r => setTimeout(r, HOLD_MS));
      if (cancelled) return;

      setExiting(true);
      await new Promise(r => setTimeout(r, EXIT_MS));
      finish();
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#070707",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Ambient spotlight */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 50% 38% at 50% 46%, rgba(70,70,90,0.32) 0%, transparent 70%)",
      }} />

      {/* Floor line */}
      <div style={{
        position: "absolute",
        top: "52%",
        left: "8%", right: "8%",
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)",
        pointerEvents: "none",
      }} />

      {/* Heel shadow on floor */}
      <motion.div
        animate={shadowCtrl}
        initial={{ opacity: 0, scaleX: 0.2 }}
        style={{
          position: "absolute",
          top: "calc(52% + 2px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 100, height: 16,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)",
          filter: "blur(5px)",
        }}
      />

      {/* Centre column: heel + logo */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 28,
        position: "relative",
      }}>

        {/* Stiletto heel — starts off-screen left */}
        <motion.div
          animate={heelCtrl}
          initial={{ x: "-110vw", y: 0, rotate: -3 }}
          style={{
            originX: "50%", originY: "90%",
            filter:
              "drop-shadow(0 18px 36px rgba(0,0,0,0.9)) " +
              "drop-shadow(0 4px 10px rgba(255,255,255,0.05))",
          }}
        >
          <svg
            width={200} height={148}
            viewBox="0 0 200 148"
            fill="none"
          >
            {/* Main silhouette — bright white stiletto pump */}
            <path d={HEEL_PATH} fill="white" opacity={0.97} />

            {/* Specular highlight along vamp top */}
            <path
              d={HEEL_HIGHLIGHT}
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Sole / outsole crease (subtle depth) */}
            <path
              d={HEEL_SOLE_CREASE}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Left edge of heel post — bright catch-light */}
            <line
              x1="23" y1="90" x2="21" y2="130"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Logo — fades in after step */}
        <AnimatePresence>
          {logoVisible && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              style={{ textAlign: "center" }}
            >
              <div style={{
                fontFamily: "'Great Vibes', cursive",
                fontWeight: 400,
                fontSize: "clamp(38px, 11vw, 56px)",
                color: "#f2f2f2",
                textShadow:
                  "0 0 28px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.95)",
                lineHeight: 1.15,
              }}>
                My Digital<br />Shoes
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.38)",
                marginTop: 8,
              }}>
                your collection, curated
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer links */}
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
