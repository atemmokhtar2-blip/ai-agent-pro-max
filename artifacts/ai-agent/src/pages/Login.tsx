/**
 * Login — Spider AI Platform
 *
 * Full redesign: cinematic splash screen → premium glass login card.
 * Color system: pure black + Spider Red (#FF1A1A).
 * All animations: transform + opacity only (60 FPS).
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from "react";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useReducedMotion,
} from "framer-motion";

// ── Zod schema ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required").min(8, "At least 8 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// ── Color tokens ──────────────────────────────────────────────────────────────

const RED       = "#FF1A1A";
const RED_HOVER = "#FF3A3A";
const RED_DIM   = "#CC1111";

// ── Spider SVG ────────────────────────────────────────────────────────────────

interface SpiderSVGProps {
  size: number;
  id: string;
  /** 0 = no glow, 1 = max glow */
  glow?: number;
  bodyOnly?: boolean;
  frontLegsOnly?: boolean;
}

function SpiderSVG({ size, id, glow = 0, bodyOnly = false, frontLegsOnly = false }: SpiderSVGProps) {
  const glowFilter =
    glow > 0
      ? `drop-shadow(0 0 ${Math.round(glow * 32)}px rgba(255,26,26,${(glow * 0.65).toFixed(2)}))`
      : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Spider"
      style={{ display: "block", filter: glowFilter }}
    >
      <defs>
        <radialGradient id={`${id}-ab`} cx="48%" cy="36%" r="62%">
          <stop offset="0%"   stopColor="#FF3A3A" />
          <stop offset="55%"  stopColor={RED} />
          <stop offset="100%" stopColor="#881010" />
        </radialGradient>
        <radialGradient id={`${id}-th`} cx="50%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#FF3030" />
          <stop offset="100%" stopColor="#AA1212" />
        </radialGradient>
        <radialGradient id={`${id}-am`} cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor={RED} stopOpacity="0.18" />
          <stop offset="100%" stopColor={RED} stopOpacity="0"   />
        </radialGradient>
        <filter id={`${id}-sf`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
        </filter>
      </defs>

      {/* Ambient glow bloom */}
      <ellipse cx="60" cy="65" rx="32" ry="38"
        fill={`url(#${id}-am)`} filter={`url(#${id}-sf)`} />

      {/* ── Legs ── */}
      {!bodyOnly && (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Front pair (L1 + R1) */}
          <path d="M 46,46 L 30,31 L 11,19" stroke={RED}    strokeWidth="3.2" />
          <path d="M 74,46 L 90,31 L 109,19" stroke={RED}    strokeWidth="3.2" />

          {/* Second pair (L2 + R2) */}
          <path d="M 46,54 L 26,46 L  6,42" stroke={RED_DIM} strokeWidth="2.9" />
          <path d="M 74,54 L 94,46 L 114,42" stroke={RED_DIM} strokeWidth="2.9" />

          {/* Third pair (L3 + R3) — hidden when frontLegsOnly */}
          {!frontLegsOnly && (
            <>
              <path d="M 46,63 L 25,68 L  6,73" stroke={RED_DIM} strokeWidth="2.9" />
              <path d="M 74,63 L 95,68 L 114,73" stroke={RED_DIM} strokeWidth="2.9" />
            </>
          )}

          {/* Back pair (L4 + R4) */}
          {!frontLegsOnly && (
            <>
              <path d="M 46,71 L 29,86 L 13,100" stroke={RED}    strokeWidth="3.0" />
              <path d="M 74,71 L 91,86 L 107,100" stroke={RED}    strokeWidth="3.0" />
            </>
          )}
        </g>
      )}

      {/* ── Body ── */}
      {/* Abdomen */}
      <ellipse cx="60" cy="77" rx="21" ry="25" fill={`url(#${id}-ab)`} />
      <ellipse cx="60" cy="71" rx="9"  ry="6"  fill="rgba(0,0,0,0.20)" />
      <ellipse cx="60" cy="81" rx="7"  ry="5"  fill="rgba(0,0,0,0.15)" />
      <ellipse cx="60" cy="90" rx="5"  ry="3.5" fill="rgba(0,0,0,0.12)" />
      <ellipse cx="54" cy="65" rx="4.5" ry="3.5" fill="rgba(255,80,80,0.16)" />

      {/* Thorax */}
      <ellipse cx="60" cy="51" rx="13" ry="12" fill={`url(#${id}-th)`} />

      {/* Head */}
      <circle cx="60" cy="36" r="9" fill={`url(#${id}-th)`} />

      {/* Eyes */}
      <circle cx="55.5" cy="34" r="2.3" fill="rgba(0,0,0,0.75)" />
      <circle cx="64.5" cy="34" r="2.3" fill="rgba(0,0,0,0.75)" />
      <circle cx="56.2" cy="33.1" r="0.7" fill="rgba(255,255,255,0.55)" />
      <circle cx="65.2" cy="33.1" r="0.7" fill="rgba(255,255,255,0.55)" />

      {/* Pedipalps */}
      <path d="M 53,29 Q 47,22 43,17" stroke={RED} strokeWidth="2.0" strokeLinecap="round" />
      <path d="M 67,29 Q 73,22 77,17" stroke={RED} strokeWidth="2.0" strokeLinecap="round" />
    </svg>
  );
}

// ── Particle canvas ───────────────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    const COUNT = 48;
    const particles = Array.from({ length: COUNT }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r:  Math.random() * 1.1 + 0.5,
      o:  Math.random() * 0.07 + 0.03,
    }));

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

// ── Splash screen ─────────────────────────────────────────────────────────────

type SplashPhase =
  | "black"
  | "particles"
  | "body"
  | "front-legs"
  | "all-legs"
  | "glow"
  | "breathing"
  | "done";

interface SplashProps {
  onComplete: () => void;
}

function SplashScreen({ onComplete }: SplashProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<SplashPhase>("black");
  const [particleOpacity, setParticleOpacity] = useState(0);
  const [bodyVisible,     setBodyVisible]     = useState(false);
  const [frontLegs,       setFrontLegs]       = useState(false);
  const [allLegs,         setAllLegs]         = useState(false);
  const [glowLevel,       setGlowLevel]       = useState(0);
  const [breathing,       setBreathing]       = useState(false);
  const [exiting,         setExiting]         = useState(false);
  const svgId = useId().replace(/:/g, "sp");

  const controls = useAnimation();

  useEffect(() => {
    if (reduced) {
      // Skip splash entirely on reduced motion
      onComplete();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const at = (ms: number, fn: () => void) => {
      timers.push(setTimeout(fn, ms));
    };

    at(500,  () => setParticleOpacity(1));
    at(1000, () => { setBodyVisible(true); setPhase("body"); });
    at(1400, () => { setFrontLegs(true);   setPhase("front-legs"); });
    at(1800, () => { setAllLegs(true);     setPhase("all-legs"); });
    at(2500, () => { setGlowLevel(0.75);   setPhase("glow"); });
    at(2800, () => { setBreathing(true);   setPhase("breathing"); });
    at(3300, () => {
      setExiting(true);
    });
    at(3900, () => {
      onComplete();
    });

    return () => timers.forEach(clearTimeout);
  }, [reduced, onComplete]);

  useEffect(() => {
    if (breathing) {
      controls.start({
        scale: [1, 1.04, 1],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      });
    }
  }, [breathing, controls]);

  if (reduced) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "#000000", zIndex: 100 }}
      animate={exiting ? { opacity: 0 } : { opacity: 1 }}
      transition={exiting ? { duration: 0.55, ease: "easeInOut" } : { duration: 0 }}
    >
      {/* Splash particles */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: particleOpacity > 0 ? 0.6 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <ParticleCanvas />
      </motion.div>

      {/* Spider logo — centered large */}
      <motion.div
        animate={controls}
        style={{ willChange: "transform" }}
      >
        {/* Glow halo behind logo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ filter: "blur(40px)", background: RED, zIndex: -1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: glowLevel > 0 ? 0.28 : 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={bodyVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Front legs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={frontLegs ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* All legs overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={allLegs ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              style={{ position: "absolute", inset: 0 }}
            />
          </motion.div>

          <SpiderSVG
            size={110}
            id={svgId}
            glow={glowLevel}
            bodyOnly={!frontLegs}
            frontLegsOnly={frontLegs && !allLegs}
          />
        </motion.div>
      </motion.div>

      {/* Exit scale-down transition hint */}
      {exiting && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
}

// ── Google & GitHub icons ─────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ── OAuth button ──────────────────────────────────────────────────────────────

type OAuthProvider = "google" | "github";

function OAuthButton({
  provider, disabled, loading, onClick,
}: { provider: OAuthProvider; disabled: boolean; loading: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const cfg = {
    google: {
      label:   "Continue with Google",
      loadingLabel: "Redirecting…",
      icon: <GoogleIcon />,
      bg: "#0E0E0E",
      color: "#FFFFFF",
    },
    github: {
      label:   "Continue with GitHub",
      loadingLabel: "Redirecting…",
      icon: <GitHubIcon />,
      bg: "#0E0E0E",
      color: "#FFFFFF",
    },
  }[provider];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      style={{
        width: "100%",
        height: 56,
        borderRadius: 18,
        background: cfg.bg,
        border: `1px solid ${hovered ? RED : "#232323"}`,
        boxShadow: hovered ? `0 0 16px rgba(255,26,26,0.18)` : "none",
        color: cfg.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontSize: 15,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "border-color 0.2s, box-shadow 0.2s",
        fontFamily: "inherit",
        letterSpacing: "0.01em",
      }}
      aria-label={cfg.label}
    >
      {cfg.icon}
      <span>{loading ? cfg.loadingLabel : cfg.label}</span>
    </motion.button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #252525)" }} />
      <span style={{ color: "#555", fontSize: 12, letterSpacing: "0.08em", whiteSpace: "nowrap", userSelect: "none" }}>
        OR SIGN IN WITH EMAIL
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #252525)" }} />
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  hasError?: boolean;
  suffix?: React.ReactNode;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}

function InputField({ id, label, type, placeholder, autoComplete, error, hasError, suffix, registration }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const shakeAnim = useAnimation();

  useEffect(() => {
    if (hasError) {
      shakeAnim.start({
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      });
    }
  }, [hasError, shakeAnim]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "#6B6B6B",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>

      <motion.div
        animate={shakeAnim}
        style={{ position: "relative" }}
      >
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            width: "100%",
            height: 58,
            borderRadius: 16,
            background: "#090909",
            border: `1px solid ${hasError ? RED : focused ? RED : "#202020"}`,
            boxShadow: focused ? `0 0 0 3px rgba(255,26,26,0.12), inset 0 0 0 1px ${RED}` : hasError ? `0 0 0 3px rgba(255,0,0,0.10)` : "none",
            color: "#FFFFFF",
            fontSize: 15,
            padding: suffix ? "0 52px 0 18px" : "0 18px",
            outline: "none",
            caretColor: RED,
            transition: "border-color 0.2s, box-shadow 0.2s",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          {...registration}
        />
        {suffix && (
          <div style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
          }}>
            {suffix}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: 12, color: "#FF0000", margin: 0, display: "flex", alignItems: "center", gap: 5 }}
          >
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#FF0000", flexShrink: 0 }} />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────

function SignInButton({ loading, disabled, svgId }: { loading: boolean; disabled: boolean; svgId: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="submit"
      disabled={disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{
        width: "100%",
        height: 58,
        borderRadius: 16,
        background: hovered && !disabled ? RED_HOVER : RED,
        border: "none",
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "0.04em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: hovered && !disabled
          ? "0 0 28px rgba(255,26,26,0.5), 0 4px 16px rgba(255,26,26,0.3)"
          : "0 0 16px rgba(255,26,26,0.25), 0 2px 8px rgba(255,26,26,0.15)",
        transition: "background 0.2s, box-shadow 0.2s",
        fontFamily: "inherit",
      }}
      aria-label={loading ? "Signing in…" : "Sign In"}
    >
      {loading && (
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <SpiderSVG size={22} id={`${svgId}-btn`} glow={0.3} />
        </motion.div>
      )}
      <span>{loading ? "Signing In…" : "Sign In"}</span>
    </motion.button>
  );
}

// ── EyeIcon ───────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Link with hover effect ────────────────────────────────────────────────────

function RedLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href}>
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          color: hovered ? RED_HOVER : RED,
          fontWeight: 600,
          textDecoration: hovered ? "underline" : "none",
          textUnderlineOffset: 3,
          cursor: "pointer",
          transition: "color 0.15s",
          textShadow: hovered ? `0 0 8px rgba(255,26,26,0.4)` : "none",
        }}
      >
        {children}
      </span>
    </Link>
  );
}

// ── Login card stagger variants ───────────────────────────────────────────────

const STAGGER_DELAY = 0.07;

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay: i * STAGGER_DELAY, ease: "easeOut" },
});

// ── Main export ───────────────────────────────────────────────────────────────

export default function Login() {
  const [, setLocation]   = useLocation();
  const { login: authenticate, isAuthenticated } = useAuth();
  const [showPassword,    setShowPassword]   = useState(false);
  const [loadingOAuth,    setLoadingOAuth]   = useState<OAuthProvider | null>(null);
  const [oauthError,      setOauthError]     = useState<string | null>(null);
  // Allow ?nosplash=1 to bypass the splash (for testing / direct links)
  const skipSplash = new URLSearchParams(window.location.search).get("nosplash") === "1";
  const [splashDone,      setSplashDone]     = useState(skipSplash);
  const uid  = useId().replace(/:/g, "lg");

  useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const loginMutation = useLogin();
  const { errors, isSubmitting } = form.formState;
  const isPending = loginMutation.isPending || isSubmitting;

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        authenticate({
          access_token:   res.access_token,
          refresh_token:  res.refresh_token,
          token_type:     res.token_type,
        });
        toast.success("Welcome back!");
        setLocation("/dashboard");
      },
      onError: (err) => {
        const message =
          (err as { data?: { error?: string } }).data?.error ||
          "Please check your credentials and try again.";
        toast.error("Sign in failed", { description: message });
      },
    });
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setLoadingOAuth(provider);
    setOauthError(null);
    try {
      const res = await fetch(`/api/v1/auth/oauth/${provider}/authorize`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setOauthError(
          body.error ??
          `${provider === "google" ? "Google" : "GitHub"} sign-in is not available right now.`
        );
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setOauthError("Network error. Please try again.");
    } finally {
      setLoadingOAuth(null);
    }
  };

  const anyOAuthLoading = !!loadingOAuth;
  const onSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <div style={{ minHeight: "100vh", background: "#000000", position: "relative" }}>

      {/* Particle background (always present, behind everything) */}
      <ParticleCanvas />

      {/* Splash screen */}
      <AnimatePresence>
        {!splashDone && (
          <SplashScreen key="splash" onComplete={onSplashComplete} />
        )}
      </AnimatePresence>

      {/* Login content */}
      <AnimatePresence>
        {splashDone && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "relative",
              zIndex: 10,
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
            }}
          >
            {/* ── Glass Card ── */}
            <div
              style={{
                width: "100%",
                maxWidth: 440,
                background: "rgba(14,14,14,0.85)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: 24,
                border: "1px solid #171717",
                boxShadow: `
                  0 0 0 1px rgba(255,26,26,0.06),
                  0 32px 64px rgba(0,0,0,0.9),
                  0 8px 24px rgba(0,0,0,0.6)
                `,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Top glow line */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(to right, transparent, rgba(255,26,26,0.35), transparent)",
              }} />

              <div style={{ padding: "40px 36px 36px" }}>

                {/* ── Header: Logo + Title ── */}
                <motion.div {...fadeUp(0)} style={{ textAlign: "center", marginBottom: 32 }}>

                  {/* Spider logo with idle breathing */}
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ display: "inline-flex", marginBottom: 20 }}
                  >
                    <SpiderSVG size={90} id={`${uid}-card`} glow={0.55} />
                  </motion.div>

                  <h1 style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    margin: "0 0 6px",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}>
                    Intelligence Starts Here
                  </h1>
                  <p style={{
                    fontSize: 14,
                    color: "#6B6B6B",
                    margin: 0,
                    letterSpacing: "0.01em",
                  }}>
                    Sign in to your AI workspace
                  </p>
                </motion.div>

                {/* ── OAuth buttons ── */}
                <motion.div {...fadeUp(1)} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  <OAuthButton
                    provider="google"
                    loading={loadingOAuth === "google"}
                    disabled={anyOAuthLoading || isPending}
                    onClick={() => handleOAuth("google")}
                  />
                  <OAuthButton
                    provider="github"
                    loading={loadingOAuth === "github"}
                    disabled={anyOAuthLoading || isPending}
                    onClick={() => handleOAuth("github")}
                  />

                  <AnimatePresence>
                    {oauthError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ fontSize: 12, color: "#AA8800", textAlign: "center", margin: 0 }}
                      >
                        {oauthError.includes("not configured") || oauthError.includes("disabled")
                          ? "Social sign-in isn't enabled yet — use email & password below."
                          : oauthError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── Divider ── */}
                <motion.div {...fadeUp(2)} style={{ marginBottom: 24 }}>
                  <Divider />
                </motion.div>

                {/* ── Form ── */}
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Email */}
                  <motion.div {...fadeUp(3)}>
                    <InputField
                      id="email"
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      error={errors.email?.message}
                      hasError={!!errors.email}
                      registration={form.register("email")}
                    />
                  </motion.div>

                  {/* Password */}
                  <motion.div {...fadeUp(4)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label
                        htmlFor="password"
                        style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#6B6B6B", textTransform: "uppercase" }}
                      >
                        Password
                      </label>
                      <RedLink href="/forgot-password">Forgot password?</RedLink>
                    </div>
                    <InputField
                      id="password"
                      label=""
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      error={errors.password?.message}
                      hasError={!!errors.password}
                      registration={form.register("password")}
                      suffix={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#555",
                            display: "flex",
                            alignItems: "center",
                            padding: 2,
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = RED)}
                          onMouseLeave={e => (e.currentTarget.style.color = "#555")}
                        >
                          <EyeIcon open={showPassword} />
                        </button>
                      }
                    />
                  </motion.div>

                  {/* Submit */}
                  <motion.div {...fadeUp(5)} style={{ marginTop: 4 }}>
                    <SignInButton
                      loading={isPending}
                      disabled={isPending || anyOAuthLoading}
                      svgId={uid}
                    />
                  </motion.div>
                </form>

                {/* ── Sign up link ── */}
                <motion.p
                  {...fadeUp(6)}
                  style={{ textAlign: "center", fontSize: 14, color: "#555", marginTop: 24, marginBottom: 0 }}
                >
                  Don&apos;t have an account?{" "}
                  <RedLink href="/register">Sign up</RedLink>
                </motion.p>
              </div>

              {/* Bottom line */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(to right, transparent, #1A1A1A, transparent)",
              }} />
            </div>

            {/* ── Footer ── */}
            <motion.p
              {...fadeUp(7)}
              style={{
                marginTop: 24,
                fontSize: 12,
                color: "#333",
                textAlign: "center",
                letterSpacing: "0.02em",
              }}
            >
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
