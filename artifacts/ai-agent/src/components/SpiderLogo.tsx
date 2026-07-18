/**
 * Spider Logo — Official brand mark for the AI platform
 *
 * A premium spider SVG mark in Spider Red (#FF1A1A).
 * Supports idle breathing, pulse, glow, and static states.
 */

import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type SpiderAnimate = "idle" | "pulse" | "glow" | "static" | "none";

interface SpiderLogoProps {
  size?: number;
  animate?: SpiderAnimate;
  className?: string;
  /** Show only body (no legs) */
  bodyOnly?: boolean;
  /** Show front legs only (first pair) */
  frontLegsOnly?: boolean;
  /** Glow intensity 0–1 */
  glowIntensity?: number;
  layoutId?: string;
}

// ── Spider SVG paths ──────────────────────────────────────────────────────────
// ViewBox: 0 0 120 120

function SpiderSVG({
  size,
  glowIntensity = 0,
  bodyOnly = false,
  frontLegsOnly = false,
  svgId,
}: {
  size: number;
  glowIntensity?: number;
  bodyOnly?: boolean;
  frontLegsOnly?: boolean;
  svgId: string;
}) {
  const red    = "#FF1A1A";
  const redDim = "#CC1111";

  const glow = glowIntensity > 0
    ? `drop-shadow(0 0 ${Math.round(glowIntensity * 28)}px rgba(255,26,26,${(glowIntensity * 0.7).toFixed(2)}))`
    : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Spider logo"
      style={{ display: "block", filter: glow }}
    >
      <defs>
        <radialGradient id={`${svgId}-body-grad`} cx="50%" cy="38%" r="62%">
          <stop offset="0%"   stopColor="#FF3A3A" />
          <stop offset="55%"  stopColor="#FF1A1A" />
          <stop offset="100%" stopColor="#991010" />
        </radialGradient>
        <radialGradient id={`${svgId}-thorax-grad`} cx="50%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#FF3030" />
          <stop offset="100%" stopColor="#AA1212" />
        </radialGradient>
        <radialGradient id={`${svgId}-glow`} cx="50%" cy="45%" r="55%">
          <stop offset="0%"   stopColor="#FF1A1A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FF1A1A" stopOpacity="0"   />
        </radialGradient>
        <filter id={`${svgId}-glow-filter`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
        </filter>
      </defs>

      {/* Ambient body glow */}
      <ellipse
        cx="60" cy="64"
        rx="30" ry="35"
        fill={`url(#${svgId}-glow)`}
        filter={`url(#${svgId}-glow-filter)`}
      />

      {/* ── Legs ── */}
      {!bodyOnly && (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Left front pair */}
          <path d="M 46,46 L 31,32 L 12,20" stroke={red}    strokeWidth="3.2" />
          <path d="M 46,53 L 27,46 L  7,42" stroke={redDim} strokeWidth="2.8" />

          {/* Right front pair */}
          <path d="M 74,46 L 89,32 L 108,20" stroke={red}    strokeWidth="3.2" />
          <path d="M 74,53 L 93,46 L 113,42" stroke={redDim} strokeWidth="2.8" />

          {/* Left back pair — only when not frontLegsOnly */}
          {!frontLegsOnly && (
            <>
              <path d="M 46,62 L 26,67 L  7,72" stroke={redDim} strokeWidth="2.8" />
              <path d="M 46,70 L 30,84 L 14,98" stroke={red}    strokeWidth="3.0" />
            </>
          )}

          {/* Right back pair */}
          {!frontLegsOnly && (
            <>
              <path d="M 74,62 L 94,67 L 113,72" stroke={redDim} strokeWidth="2.8" />
              <path d="M 74,70 L 90,84 L 106,98" stroke={red}    strokeWidth="3.0" />
            </>
          )}
        </g>
      )}

      {/* ── Body ── */}
      {/* Abdomen */}
      <ellipse
        cx="60" cy="76"
        rx="21" ry="25"
        fill={`url(#${svgId}-body-grad)`}
      />
      {/* Abdomen markings */}
      <ellipse cx="60" cy="70" rx="9" ry="6"  fill="rgba(0,0,0,0.18)" />
      <ellipse cx="60" cy="80" rx="7" ry="5"  fill="rgba(0,0,0,0.14)" />
      <ellipse cx="60" cy="89" rx="5" ry="3.5" fill="rgba(0,0,0,0.12)" />

      {/* Thorax (cephalothorax) */}
      <ellipse
        cx="60" cy="50"
        rx="13" ry="12"
        fill={`url(#${svgId}-thorax-grad)`}
      />

      {/* Head */}
      <circle cx="60" cy="36" r="9" fill={`url(#${svgId}-thorax-grad)`} />

      {/* Eyes */}
      <circle cx="56" cy="34" r="2.2" fill="#000" opacity="0.7" />
      <circle cx="64" cy="34" r="2.2" fill="#000" opacity="0.7" />
      <circle cx="56.7" cy="33.2" r="0.7" fill="rgba(255,255,255,0.6)" />
      <circle cx="64.7" cy="33.2" r="0.7" fill="rgba(255,255,255,0.6)" />

      {/* Pedipalps (small front appendages) */}
      <path d="M 54,29 Q 48,22 44,18" stroke={red} strokeWidth="2" strokeLinecap="round" />
      <path d="M 66,29 Q 72,22 76,18" stroke={red} strokeWidth="2" strokeLinecap="round" />

      {/* Highlight on abdomen */}
      <ellipse cx="54" cy="64" rx="5" ry="4" fill="rgba(255,80,80,0.18)" />
    </svg>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export function SpiderLogo({
  size = 64,
  animate = "idle",
  className,
  bodyOnly = false,
  frontLegsOnly = false,
  glowIntensity = 0,
  layoutId,
}: SpiderLogoProps) {
  const reduced  = useReducedMotion();
  const controls = useAnimation();
  const svgId    = `spider-${Math.random().toString(36).slice(2, 7)}`;

  useEffect(() => {
    if (reduced || animate === "static" || animate === "none") return;

    if (animate === "idle") {
      controls.start({
        scale: [1, 1.04, 1],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      });
    } else if (animate === "pulse") {
      controls.start({
        scale: [1, 1.10, 1],
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      });
    } else if (animate === "glow") {
      controls.start({
        scale: [1, 1.03, 1],
        filter: [
          "drop-shadow(0 0 8px rgba(255,26,26,0.35))",
          "drop-shadow(0 0 24px rgba(255,26,26,0.7))",
          "drop-shadow(0 0 8px rgba(255,26,26,0.35))",
        ],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      });
    }
  }, [animate, reduced, controls]);

  const motionProps = layoutId ? { layoutId } : {};

  return (
    <motion.div
      className={cn("inline-flex flex-shrink-0 cursor-default select-none", className)}
      animate={controls}
      {...motionProps}
    >
      <SpiderSVG
        size={size}
        glowIntensity={glowIntensity}
        bodyOnly={bodyOnly}
        frontLegsOnly={frontLegsOnly}
        svgId={svgId}
      />
    </motion.div>
  );
}
