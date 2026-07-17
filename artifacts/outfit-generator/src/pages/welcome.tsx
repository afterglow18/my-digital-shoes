/**
 * WelcomePage — hero image with title overlay and tap to enter.
 */
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

interface Props { onEnter: () => void; }

const EXIT_MS = 600;

export default function WelcomePage({ onEnter }: Props) {
  const [exiting, setExiting] = useState(false);
  const calledRef = useRef(false);

  const handleTap = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      if (calledRef.current) return;
      calledRef.current = true;
      onEnter();
    }, EXIT_MS);
  }, [exiting, onEnter]);

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Hero image — full cover */}
      <img
        src="/handbag-hero.jpg"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", zIndex: 0,
        }}
      />

      {/* Dark gradient overlay for legibility */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.65) 100%)",
        pointerEvents: "none",
      }} />

      {/* Title + prompt */}
      <div style={{
        position: "absolute", bottom: "22%",
        left: 0, right: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 22,
        zIndex: 10, pointerEvents: "none",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: "clamp(26px, 8vw, 38px)",
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 2px 12px rgba(0,0,0,0.60)",
            lineHeight: 1.3,
          }}>
            Welcome to
          </div>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: "clamp(42px, 13vw, 60px)",
            color: "#fff",
            textShadow: "0 2px 16px rgba(0,0,0,0.70)",
            lineHeight: 1.2,
          }}>
            My Digital Shoes
          </div>
        </div>

        <motion.button
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          onClick={handleTap}
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: "#fff",
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.55)",
            borderRadius: 40,
            padding: "10px 28px",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            pointerEvents: "auto",
          }}
        >
          TAP TO ENTER
        </motion.button>
      </div>

      {/* Footer links */}
      <div style={{
        position: "absolute",
        bottom: "calc(env(safe-area-inset-bottom) + 10px)",
        left: 0, right: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4, zIndex: 10,
      }}>
        <a href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.40)",
            textDecoration: "none", letterSpacing: "0.02em",
          }}>
          Privacy Policy
        </a>
        <a href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.40)",
            textDecoration: "none", letterSpacing: "0.02em",
          }}>
          Support
        </a>
      </div>
    </motion.div>
  );
}
