/**
 * Login — كودك (Kodak) Platform
 *
 * Cyberpunk neon login page with purple/blue glow, code background,
 * and the "كودك" branding. Full-screen immersive design.
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
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Zod schema ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().min(1, "البريد الإلكتروني أو اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة").min(8, "8 أحرف على الأقل"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// ── Color tokens ───────────────────────────────────────────────────────────────

const PURPLE      = "#9B5CFF";
const PURPLE_BRIGHT = "#B07CFF";
const PURPLE_DIM  = "#6B3FCF";
const BLUE_GLOW   = "#4FC3F7";
const NEON_PINK   = "#E040FB";

// ── Global CSS keyframes ───────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes logoFloat {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-8px); }
  }
  @keyframes logoGlow {
    0%,100% {
      filter:
        drop-shadow(0 0 20px rgba(155,92,255,0.4))
        drop-shadow(0 0 40px rgba(79,195,247,0.2));
    }
    50% {
      filter:
        drop-shadow(0 0 30px rgba(155,92,255,0.7))
        drop-shadow(0 0 60px rgba(79,195,247,0.35));
    }
  }
  @keyframes ringRotate {
    0%   { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes ringRotateReverse {
    0%   { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(-360deg); }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes codeFlicker {
    0%, 100% { opacity: 0.12; }
    50%      { opacity: 0.18; }
  }
  @keyframes inputGlow {
    0%,100% { box-shadow: 0 0 5px rgba(155,92,255,0.2), inset 0 0 5px rgba(155,92,255,0.05); }
    50%     { box-shadow: 0 0 15px rgba(155,92,255,0.4), inset 0 0 10px rgba(155,92,255,0.1); }
  }
  @keyframes buttonPulse {
    0%,100% { box-shadow: 0 0 15px rgba(155,92,255,0.3), 0 0 30px rgba(79,195,247,0.15); }
    50%     { box-shadow: 0 0 25px rgba(155,92,255,0.5), 0 0 50px rgba(79,195,247,0.25); }
  }
  @keyframes particleFloat {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(-200px) translateX(30px); opacity: 0; }
  }
`;

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  keyframesInjected = true;
}

// ── Code Background ────────────────────────────────────────────────────────────

function CodeBackground() {
  const codeLines = [
    "const agent = new Agent();",
    "function deploy() {",
    "  return new Promise((r) =>",
    "    setTimeout(r, 2000)",
    "  );",
    "}",
    "import { AI } from '@core';",
    "const model = AI.load('gpt');",
    "async function run() {",
    "  const res = await model.query();",
    "  console.log(res.data);",
    "}",
    "class Workflow {",
    "  constructor(steps) {",
    "    this.steps = steps;",
    "  }",
    "  async execute() {",
    "    for (const s of this.steps)",
    "      await s.run();",
    "  }",
    "}",
    "export default {",
    "  name: 'ai-agent',",
    "  version: '2.0.0',",
    "};",
    "const config = {",
    "  maxTokens: 4096,",
    "  temperature: 0.7,",
    "};",
    "await db.connect();",
    "const users = await User.findAll();",
  ];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      zIndex: 0,
      pointerEvents: "none",
    }}>
      {/* Base gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 30% 20%, rgba(155,92,255,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 70% 80%, rgba(79,195,247,0.06) 0%, transparent 50%),
          radial-gradient(ellipse 40% 40% at 50% 50%, rgba(224,64,251,0.04) 0%, transparent 50%),
          #050508
        `,
      }} />

      {/* Code columns */}
      <div style={{ position: "absolute", inset: 0, display: "flex", gap: 40, padding: "20px 0", animation: "codeFlicker 4s ease-in-out infinite" }}>
        {codeLines.map((line, i) => {
          const col = i % 3;
          const offset = (i * 7) % 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: col === 0 ? "2%" : col === 1 ? "33%" : "64%",
                top: `${offset}%`,
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                fontSize: 11,
                color: `rgba(${col === 0 ? '155,92,255' : col === 1 ? '79,195,247' : '224,64,251'},0.18)`,
                whiteSpace: "nowrap",
                lineHeight: 2,
                userSelect: "none",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Scanline effect */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(to right, transparent, rgba(155,92,255,0.15), transparent)",
        animation: "scanline 8s linear infinite",
      }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(155,92,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(155,92,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* Floating particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`p-${i}`}
          style={{
            position: "absolute",
            left: `${10 + (i * 7) % 80}%`,
            bottom: "-10px",
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: i % 3 === 0 ? PURPLE : i % 3 === 1 ? BLUE_GLOW : NEON_PINK,
            animation: `particleFloat ${5 + (i % 4)}s ease-in-out ${i * 0.7}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Kodak Logo with rotating rings ─────────────────────────────────────────────

function KodakLogo({ authenticating }: { authenticating: boolean }) {
  return (
    <div style={{
      position: "relative",
      width: 200,
      height: 200,
      margin: "0 auto 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Outer rotating ring */}
      <div style={{
        position: "absolute",
        width: 190,
        height: 190,
        borderRadius: "50%",
        border: "1px solid rgba(155,92,255,0.3)",
        top: "50%",
        left: "50%",
        animation: "ringRotate 20s linear infinite",
      }} />

      {/* Outer ring with dashes */}
      <div style={{
        position: "absolute",
        width: 190,
        height: 190,
        borderRadius: "50%",
        border: "2px solid transparent",
        borderTopColor: "rgba(79,195,247,0.5)",
        borderRightColor: "rgba(155,92,255,0.3)",
        top: "50%",
        left: "50%",
        animation: "ringRotateReverse 15s linear infinite",
      }} />

      {/* Inner rotating ring */}
      <div style={{
        position: "absolute",
        width: 150,
        height: 150,
        borderRadius: "50%",
        border: "1px solid rgba(224,64,251,0.2)",
        borderBottomColor: "rgba(79,195,247,0.4)",
        top: "50%",
        left: "50%",
        animation: "ringRotate 12s linear infinite",
      }} />

      {/* Inner glow circle */}
      <div style={{
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(155,92,255,0.15) 0%, transparent 70%)",
        top: "50%",
        left: "50%",
        animation: authenticating ? "logoGlow 1s ease-in-out infinite" : "logoGlow 4s ease-in-out infinite",
      }} />

      {/* Center content */}
      <div style={{
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        animation: "logoFloat 6s ease-in-out infinite",
      }}>
        {/* </> icon */}
        <div style={{
          fontSize: 42,
          fontWeight: 900,
          color: PURPLE_BRIGHT,
          textShadow: "0 0 20px rgba(155,92,255,0.6), 0 0 40px rgba(79,195,247,0.3)",
          lineHeight: 1,
          marginBottom: 2,
        }}>
          {"</>"}
        </div>
        {/* Arabic brand name */}
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          color: "#FFFFFF",
          textShadow: "0 0 15px rgba(155,92,255,0.5)",
          direction: "rtl",
          lineHeight: 1.2,
        }}>
          كودك
        </div>
      </div>
    </div>
  );
}

// ── Tagline ────────────────────────────────────────────────────────────────────

function Tagline() {
  return (
    <div style={{
      textAlign: "center",
      marginBottom: 32,
      direction: "rtl",
    }}>
      <p style={{
        fontSize: 14,
        color: "rgba(176,124,255,0.8)",
        margin: 0,
        letterSpacing: "0.02em",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
      }}>
        {"_> طوّر فكرتك بكود"}
      </p>
    </div>
  );
}

// ── Cyber Input Field ──────────────────────────────────────────────────────────

interface CyberInputProps {
  id: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  hasError?: boolean;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}

function CyberInput({ id, placeholder, type, autoComplete, icon, suffix, error, hasError, registration }: CyberInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ direction: "rtl", marginBottom: 16 }}>
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}>
        {/* Hexagonal/angular container */}
        <div style={{
          position: "relative",
          width: "100%",
          height: 56,
        }}>
          {/* Background with cyber edges */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(155,92,255,0.08) 0%, rgba(5,5,8,0.95) 50%, rgba(79,195,247,0.06) 100%)",
            clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
            border: `1px solid ${
              hasError ? "rgba(255,60,60,0.7)"
              : focused ? "rgba(155,92,255,0.6)"
              : "rgba(155,92,255,0.2)"
            }`,
            transition: "border-color 0.3s, box-shadow 0.3s",
            boxShadow: focused
              ? "0 0 20px rgba(155,92,255,0.15), 0 0 40px rgba(79,195,247,0.08)"
              : hasError
              ? "0 0 10px rgba(255,60,60,0.1)"
              : "none",
          }} />

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
              position: "relative",
              width: "100%",
              height: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#E8E8F0",
              fontSize: 14,
              padding: suffix ? "0 50px 0 16px" : "0 48px 0 16px",
              fontFamily: "inherit",
              caretColor: PURPLE_BRIGHT,
              textAlign: "right",
              direction: "rtl",
              zIndex: 1,
            }}
            {...registration}
          />

          {/* Icon */}
          <div style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? PURPLE_BRIGHT : "rgba(155,92,255,0.4)",
            transition: "color 0.3s",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
          }}>
            {icon}
          </div>

          {/* Suffix (eye toggle) */}
          {suffix && (
            <div style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
            }}>
              {suffix}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.14 }}
            style={{
              fontSize: 12,
              color: "#FF3C3C",
              margin: "6px 0 0 0",
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Eye icon ───────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(176,124,255,0.6)" }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(176,124,255,0.4)" }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Cyber Button ───────────────────────────────────────────────────────────────

function CyberButton({ loading, disabled, children }: { loading: boolean; disabled: boolean; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="submit"
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: 56,
        position: "relative",
        background: hovered && !disabled
          ? "linear-gradient(135deg, rgba(155,92,255,0.95) 0%, rgba(79,195,247,0.85) 100%)"
          : "linear-gradient(135deg, rgba(155,92,255,0.75) 0%, rgba(79,195,247,0.65) 100%)",
        border: "1px solid rgba(155,92,255,0.5)",
        clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        letterSpacing: "0.05em",
        direction: "rtl",
        transition: "all 0.3s ease",
        boxShadow: hovered && !disabled
          ? "0 0 25px rgba(155,92,255,0.4), 0 0 50px rgba(79,195,247,0.2)"
          : "0 0 15px rgba(155,92,255,0.2), 0 0 30px rgba(79,195,247,0.1)",
        animation: loading ? "buttonPulse 1.5s ease-in-out infinite" : "none",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span>{children}</span>
        {loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        )}
        {!loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5" />
            <path d="M12 5l-7 7 7 7" />
          </svg>
        )}
      </span>
    </button>
  );
}

// ── OAuth buttons ──────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" width="20" height="20" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

type OAuthProvider = "google" | "github" | "microsoft";

function OAuthIconBtn({
  provider,
  disabled,
  loading,
  onClick,
}: {
  provider: OAuthProvider;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const cfg = {
    google:    { icon: <GoogleIcon />,    label: "Google" },
    github:    { icon: <GitHubIcon />,   label: "GitHub" },
    microsoft: { icon: <MicrosoftIcon />, label: "Microsoft" },
  }[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: hovered && !disabled
          ? "rgba(155,92,255,0.15)"
          : "rgba(155,92,255,0.05)",
        border: `1px solid ${hovered ? "rgba(155,92,255,0.5)" : "rgba(155,92,255,0.15)"}`,
        color: hovered ? PURPLE_BRIGHT : "rgba(155,92,255,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.3s ease",
        boxShadow: hovered ? "0 0 15px rgba(155,92,255,0.2)" : "none",
      }}
      aria-label={`Continue with ${cfg.label}`}
      title={cfg.label}
    >
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : cfg.icon}
    </button>
  );
}

// ── Cyber link ─────────────────────────────────────────────────────────────────

function CyberLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href}>
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          color: hovered ? PURPLE_BRIGHT : PURPLE,
          fontWeight: 600,
          textDecoration: hovered ? "underline" : "none",
          textUnderlineOffset: 3,
          cursor: "pointer",
          transition: "color 0.2s",
          fontSize: 13,
        }}
      >
        {children}
      </span>
    </Link>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authenticate, isAuthenticated } = useAuth();
  const [showPassword,  setShowPassword]  = useState(false);
  const [loadingOAuth,  setLoadingOAuth]  = useState<OAuthProvider | null>(null);
  const [oauthError,    setOauthError]    = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    ensureKeyframes();
    const t = setTimeout(() => setPageReady(true), 100);
    return () => clearTimeout(t);
  }, []);

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
          access_token:  res.access_token,
          refresh_token: res.refresh_token,
          token_type:    res.token_type,
        });
        toast.success("مرحباً بعودتك!");
        setLocation("/dashboard");
      },
      onError: (err) => {
        const message =
          (err as { data?: { error?: string } }).data?.error ||
          "يرجى التحقق من بياناتك والمحاولة مرة أخرى.";
        toast.error("فشل تسجيل الدخول", { description: message });
      },
    });
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setLoadingOAuth(provider);
    setOauthError(null);
    try {
      const providerName = provider === "microsoft" ? "github" : provider;
      const res = await fetch(`/api/v1/auth/oauth/${providerName}/authorize`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setOauthError(
          body.error ??
          `تسجيل الدخول عبر ${provider} غير متاح حالياً.`
        );
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setOauthError("خطأ في الاتصال. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoadingOAuth(null);
    }
  };

  const anyOAuthLoading = !!loadingOAuth;

  // User icon
  const UserIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  // Lock icon
  const LockIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );

  return (
    <>
      {/* ── Background ── */}
      <CodeBackground />

      {/* ── Main content ── */}
      <AnimatePresence>
        {pageReady && (
          <motion.div
            key="login-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "relative",
              zIndex: 10,
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 20px",
            }}
          >
            {/* ── Logo Section ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <KodakLogo authenticating={isPending} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Tagline />
            </motion.div>

            {/* ── Input Fields ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <CyberInput
                id="email"
                placeholder="البريد الإلكتروني أو اسم المستخدم"
                type="text"
                autoComplete="username"
                icon={UserIcon}
                error={errors.email?.message}
                hasError={!!errors.email}
                registration={form.register("email")}
              />

              <CyberInput
                id="password"
                placeholder="كلمة المرور"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                icon={LockIcon}
                error={errors.password?.message}
                hasError={!!errors.password}
                registration={form.register("password")}
                suffix={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(176,124,255,0.4)",
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = PURPLE_BRIGHT)}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(176,124,255,0.4)")}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                }
              />
            </motion.div>

            {/* ── Forgot password ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              style={{
                width: "100%",
                maxWidth: 380,
                textAlign: "right",
                direction: "rtl",
                marginBottom: 24,
              }}
            >
              <CyberLink href="/forgot-password">نسيت كلمة المرور؟</CyberLink>
            </motion.div>

            {/* ── Login Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <CyberButton
                  loading={isPending}
                  disabled={isPending || anyOAuthLoading}
                >
                  دخول
                </CyberButton>
              </form>

              <AnimatePresence>
                {oauthError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      fontSize: 12,
                      color: "rgba(255,150,100,0.8)",
                      textAlign: "center",
                      margin: "10px 0 0",
                      direction: "rtl",
                    }}
                  >
                    {oauthError}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── OR Divider ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.65 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: "100%",
                maxWidth: 380,
                margin: "20px 0",
              }}
            >
              <div style={{
                flex: 1,
                height: 1,
                background: "linear-gradient(to right, transparent, rgba(155,92,255,0.3))",
              }} />
              <span style={{
                color: "rgba(155,92,255,0.5)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}>
                أو
              </span>
              <div style={{
                flex: 1,
                height: 1,
                background: "linear-gradient(to left, transparent, rgba(155,92,255,0.3))",
              }} />
            </motion.div>

            {/* ── OAuth Buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
              }}
            >
              <OAuthIconBtn
                provider="github"
                loading={loadingOAuth === "github"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("github")}
              />
              <OAuthIconBtn
                provider="google"
                loading={loadingOAuth === "google"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("google")}
              />
              <OAuthIconBtn
                provider="microsoft"
                loading={loadingOAuth === "microsoft"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("microsoft")}
              />
            </motion.div>

            {/* ── Sign up link ── */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              style={{
                textAlign: "center",
                direction: "rtl",
                marginTop: 28,
                marginBottom: 0,
              }}
            >
              <span style={{ color: "rgba(155,92,255,0.5)", fontSize: 13 }}>
                ليس لديك حساب؟{" "}
              </span>
              <CyberLink href="/register">أنشئ حساب جديد</CyberLink>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
