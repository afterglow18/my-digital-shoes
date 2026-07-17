/**
 * WelcomePage — Shoe lace tying animation.
 *
 * SPLASH  : sneaker with two loose lace ends hanging from the top eyelet
 * TYING   : lace ends lift and form a bow (loops draw in, knot appears)
 * ZOOMING : whole shoe scales up — camera dives into the bow
 * HERO    : hero image crossfades in at peak zoom
 * EXITING : whole screen fades out → onEnter()
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

type Phase = "splash" | "tying" | "zooming" | "hero" | "exiting";

const TIE_MS  = 1600;
const ZOOM_MS = 950;
const HERO_MS = 800;
const HOLD_MS = 500;
const EXIT_MS = 700;

// ── Sneaker geometry (SVG px) ─────────────────────────────────────────────────
const W  = 240;        // canvas width
const H  = 310;        // canvas height

const SX = 15, SY = 30, SW = 210, SH = 250;   // shoe body
const laceCX = SX + SW / 2;                     // 120 — horizontal centre

const TX = laceCX - 26;                          // tongue left
const TY = SY + 10;                             // tongue top
const TW = 52;                                  // tongue width
const TH = 90;                                  // tongue height

const EL = TX - 4;                              // eyelet column — left  (116)
const ER = TX + TW + 4;                         // eyelet column — right (182)
const EYS = [TY + 12, TY + 28, TY + 44, TY + 60] as const; // 4 eyelet rows

const BOW_Y  = EYS[0] - 2;  // bow centre Y (just above top eyelet)
const BOW_CX = laceCX;       // bow centre X

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [phase,       setPhase]       = useState<Phase>("splash");
  const [heroVisible, setHeroVisible] = useState(false);
  const calledRef    = useRef(false);

  // Framer controls
  const shoeCtrl       = useAnimation();   // whole-shoe zoom out
  const looseLeftCtrl  = useAnimation();   // loose left lace end
  const looseRightCtrl = useAnimation();   // loose right lace end
  const knotCtrl       = useAnimation();   // knot circle
  const leftLoopCtrl   = useAnimation();   // left bow loop (pathLength)
  const rightLoopCtrl  = useAnimation();   // right bow loop (pathLength)
  const leftTailCtrl   = useAnimation();   // left tail after bow
  const rightTailCtrl  = useAnimation();   // right tail after bow

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleTap = async () => {
    if (phase !== "splash") return;
    setPhase("tying");

    // Loose ends fade & retract upward
    looseLeftCtrl.start({
      opacity: 0, y: -18,
      transition: { duration: 0.35, ease: "easeIn" },
    });
    looseRightCtrl.start({
      opacity: 0, y: -18,
      transition: { duration: 0.35, ease: "easeIn" },
    });

    // Knot pops in
    setTimeout(() => {
      knotCtrl.start({ opacity: 1, scale: 1, transition: { duration: 0.25, ease: "backOut" } });
    }, 280);

    // Left loop draws itself in
    setTimeout(() => {
      leftLoopCtrl.start({
        pathLength: 1, opacity: 1,
        transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
      });
    }, 420);

    // Right loop draws itself in (slight stagger)
    setTimeout(() => {
      rightLoopCtrl.start({
        pathLength: 1, opacity: 1,
        transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
      });
    }, 600);

    // Tails appear
    setTimeout(() => {
      leftTailCtrl.start({
        pathLength: 1, opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" },
      });
      rightTailCtrl.start({
        pathLength: 1, opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" },
      });
    }, 980);

    // After tying → zoom shoe up and off screen
    setTimeout(async () => {
      setPhase("zooming");
      shoeCtrl.start({
        scale: 18,
        y: -50,
        opacity: 0,
        transition: { duration: ZOOM_MS / 1000, ease: [0.4, 0, 1, 1] },
      });
    }, TIE_MS + 60);

    setTimeout(() => setHeroVisible(true),   TIE_MS + ZOOM_MS * 0.38);
    setTimeout(() => setPhase("hero"),       TIE_MS + ZOOM_MS * 0.65);
    setTimeout(() => setPhase("exiting"),    TIE_MS + ZOOM_MS + HOLD_MS);
    setTimeout(finish,                       TIE_MS + ZOOM_MS + HOLD_MS + EXIT_MS);
  };

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={phase === "splash" ? handleTap : undefined}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#080808",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: phase === "splash" ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* Soft spotlight from above */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 42% at 50% 38%, rgba(80,80,100,0.38) 0%, transparent 70%)",
      }} />

      {/* Hero image — crossfades in at end */}
      <motion.img
        src="/handbag-hero.jpg"
        alt="Shoe collection"
        draggable={false}
        animate={{ opacity: heroVisible ? 1 : 0 }}
        transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center", zIndex: 1,
        }}
      />

      {/* Shoe + branding — zooms on cue */}
      <motion.div
        animate={shoeCtrl}
        style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
          transformOrigin: `${BOW_CX}px ${BOW_Y}px`,
        }}
      >
        {/* ── Shoe illustration ── */}
        <div style={{
          position: "relative", width: W, height: H,
          filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.95)) drop-shadow(0 6px 18px rgba(0,0,0,0.7))",
        }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" overflow="visible">
            <defs>
              <linearGradient id="shoeBody" x1="0" y1="0" x2="0.25" y2="1">
                <stop offset="0%"   stopColor="#2c2c2c" />
                <stop offset="45%"  stopColor="#181818" />
                <stop offset="100%" stopColor="#0c0c0c" />
              </linearGradient>
              <linearGradient id="tongueBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#303030" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
              <linearGradient id="soleAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
              </linearGradient>
              <linearGradient id="sheen" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%"   stopColor="white" stopOpacity="0.07" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ── Shoe body ── */}
            <rect x={SX} y={SY} width={SW} height={SH} rx={24}
              fill="url(#shoeBody)" />
            <rect x={SX} y={SY} width={SW} height={SH} rx={24}
              fill="url(#sheen)" />
            <rect x={SX} y={SY} width={SW} height={SH} rx={24}
              fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" />

            {/* Sole strip at bottom */}
            <rect x={SX} y={SY + SH - 32} width={SW} height={32} rx={24}
              fill="url(#soleAccent)" />
            <line
              x1={SX + 10} y1={SY + SH - 32}
              x2={SX + SW - 10} y2={SY + SH - 32}
              stroke="rgba(255,255,255,0.09)" strokeWidth="0.9"
            />

            {/* ── Tongue ── */}
            <rect x={TX} y={TY} width={TW} height={TH} rx={9}
              fill="url(#tongueBody)" />
            <rect x={TX} y={TY} width={TW} height={TH} rx={9}
              fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.9" />
            {/* Stitching */}
            <rect x={TX + 5} y={TY + 5} width={TW - 10} height={TH - 10} rx={6}
              fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.8" strokeDasharray="3 3" />

            {/* ── Eyelets ── */}
            {EYS.map((y, i) => (
              <g key={i}>
                <circle cx={EL} cy={y} r={5.5}
                  fill="#0e0e0e" stroke="rgba(255,255,255,0.28)" strokeWidth="1.3" />
                <circle cx={ER} cy={y} r={5.5}
                  fill="#0e0e0e" stroke="rgba(255,255,255,0.28)" strokeWidth="1.3" />
                {/* Eyelet inner highlight */}
                <circle cx={EL} cy={y} r={2.5} fill="rgba(255,255,255,0.06)" />
                <circle cx={ER} cy={y} r={2.5} fill="rgba(255,255,255,0.06)" />
              </g>
            ))}

            {/* ── Bar laces connecting each row ── */}
            {EYS.map((y, i) => (
              <line key={i}
                x1={EL} y1={y} x2={ER} y2={y}
                stroke="rgba(255,255,255,0.58)" strokeWidth="2.4" strokeLinecap="round"
              />
            ))}

            {/* Vertical lace runs on each side (lace going between rows) */}
            {EYS.slice(0, -1).map((y, i) => (
              <g key={i}>
                <line x1={EL} y1={y} x2={EL} y2={EYS[i + 1]}
                  stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeLinecap="round" />
                <line x1={ER} y1={y} x2={ER} y2={EYS[i + 1]}
                  stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            ))}

            {/* ── Loose lace ends (visible before tying, hidden on tap) ── */}
            {/* Left loose end — hangs from top-left eyelet, curves gently left-down */}
            <motion.path
              animate={looseLeftCtrl}
              initial={{ opacity: 1, y: 0 }}
              d={`M ${EL} ${EYS[0]} C ${EL - 6} ${EYS[0] + 22}, ${EL - 16} ${EYS[0] + 44}, ${EL - 10} ${EYS[0] + 68}`}
              stroke="rgba(255,255,255,0.78)" strokeWidth="2.6" strokeLinecap="round" fill="none"
            />
            {/* Right loose end — hangs from top-right eyelet, curves gently right-down */}
            <motion.path
              animate={looseRightCtrl}
              initial={{ opacity: 1, y: 0 }}
              d={`M ${ER} ${EYS[0]} C ${ER + 6} ${EYS[0] + 22}, ${ER + 16} ${EYS[0] + 44}, ${ER + 10} ${EYS[0] + 68}`}
              stroke="rgba(255,255,255,0.78)" strokeWidth="2.6" strokeLinecap="round" fill="none"
            />

            {/* ── Bow (appears during tying) ── */}

            {/* Knot — small oval at centre */}
            <motion.ellipse
              animate={knotCtrl}
              initial={{ opacity: 0, scale: 0 }}
              cx={BOW_CX} cy={BOW_Y + 2}
              rx={7} ry={5}
              fill="rgba(255,255,255,0.92)"
              style={{ originX: `${BOW_CX}px`, originY: `${BOW_Y + 2}px` } as React.CSSProperties}
            />

            {/* Left bow loop — teardrop sweeping upper-left */}
            <motion.path
              animate={leftLoopCtrl}
              initial={{ pathLength: 0, opacity: 0 }}
              d={`M ${BOW_CX - 6} ${BOW_Y - 2}
                  C ${BOW_CX - 28} ${BOW_Y - 52},
                    ${BOW_CX - 60} ${BOW_Y - 40},
                    ${BOW_CX - 52} ${BOW_Y - 12}
                  C ${BOW_CX - 44} ${BOW_Y + 2},
                    ${BOW_CX - 18} ${BOW_Y + 4},
                    ${BOW_CX - 6} ${BOW_Y - 2}`}
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
            />

            {/* Right bow loop — teardrop sweeping upper-right */}
            <motion.path
              animate={rightLoopCtrl}
              initial={{ pathLength: 0, opacity: 0 }}
              d={`M ${BOW_CX + 6} ${BOW_Y - 2}
                  C ${BOW_CX + 28} ${BOW_Y - 52},
                    ${BOW_CX + 60} ${BOW_Y - 40},
                    ${BOW_CX + 52} ${BOW_Y - 12}
                  C ${BOW_CX + 44} ${BOW_Y + 2},
                    ${BOW_CX + 18} ${BOW_Y + 4},
                    ${BOW_CX + 6} ${BOW_Y - 2}`}
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
            />

            {/* Left bow tail — hangs down-left from knot */}
            <motion.path
              animate={leftTailCtrl}
              initial={{ pathLength: 0, opacity: 0 }}
              d={`M ${BOW_CX - 5} ${BOW_Y + 4}
                  C ${BOW_CX - 16} ${BOW_Y + 22},
                    ${BOW_CX - 26} ${BOW_Y + 36},
                    ${BOW_CX - 18} ${BOW_Y + 52}`}
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.6" strokeLinecap="round" fill="none"
            />

            {/* Right bow tail — hangs down-right from knot */}
            <motion.path
              animate={rightTailCtrl}
              initial={{ pathLength: 0, opacity: 0 }}
              d={`M ${BOW_CX + 5} ${BOW_Y + 4}
                  C ${BOW_CX + 16} ${BOW_Y + 22},
                    ${BOW_CX + 26} ${BOW_Y + 36},
                    ${BOW_CX + 18} ${BOW_Y + 52}`}
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.6" strokeLinecap="round" fill="none"
            />
          </svg>
        </div>

        {/* ── Branding ── */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontWeight: 400,
            fontSize: "clamp(38px, 11vw, 56px)",
            color: "#f2f2f2",
            textShadow: "0 0 28px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.95)",
            lineHeight: 1.15,
          }}>
            My Digital<br />Shoes
          </div>
          <div style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(247,242,236,0.45)", marginTop: 7,
          }}>
            your collection, curated
          </div>

          <AnimatePresence>
            {phase === "splash" && (
              <motion.div
                key="tap-hint"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{
                  fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(247,242,236,0.5)", marginTop: 18,
                }}
              >
                tap to open
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Privacy Policy
        </a>
        <a
          href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Support
        </a>
      </div>
    </motion.div>
  );
}
