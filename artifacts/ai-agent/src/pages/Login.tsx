/**
 * Login — كودك (Kodak) Platform
 *
 * Cyberpunk neon login page matching the exact design reference.
 * Full-screen immersive cyberpunk city background with code columns,
 * 3D glass logo ring, and RTL Arabic interface.
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

const PURPLE        = "#9B5CFF";
const PURPLE_BRIGHT = "#B07CFF";
const PURPLE_DIM    = "#6B3FCF";
const BLUE_GLOW     = "#4FC3F7";
const NEON_PINK     = "#E040FB";
const CYAN          = "#00E5FF";

// ── Global CSS keyframes ───────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes codeScroll {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes glowPulse {
    0%,100% {
      filter: drop-shadow(0 0 15px rgba(155,92,255,0.5)) drop-shadow(0 0 30px rgba(79,195,247,0.2));
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(155,92,255,0.7)) drop-shadow(0 0 50px rgba(79,195,247,0.35));
    }
  }
  @keyframes ringRotate {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes ringRotateReverse {
    0%   { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes buttonGlow {
    0%,100% { box-shadow: 0 0 20px rgba(155,92,255,0.4), 0 0 40px rgba(79,195,247,0.15), inset 0 0 20px rgba(155,92,255,0.1); }
    50%     { box-shadow: 0 0 30px rgba(155,92,255,0.6), 0 0 60px rgba(79,195,247,0.25), inset 0 0 30px rgba(155,92,255,0.15); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-6px); }
  }
  @keyframes neonFlicker {
    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
    20%, 24%, 55% { opacity: 0.6; }
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

// ── Cyberpunk City Background ─────────────────────────────────────────────────

function CyberpunkBackground() {
  const codeLinesLeft = [
    "function deploy() {",
    "  const agent = new Agent({",
    "    model: 'gpt-4',",
    "    maxTokens: 4096,",
    "  });",
    "  return agent.run();",
    "}",
    "import { AI } from '@core/ai';",
    "const pipeline = new Pipeline();",
    "pipeline.add(task);",
    "async function execute() {",
    "  const result = await AI.query(",
    "    prompt, context",
    "  );",
    "  return result.data;",
    "}",
    "class NeuralNet {",
    "  constructor(layers) {",
    "    this.layers = layers;",
    "  }",
    "  async predict(input) {",
    "    let output = input;",
    "    for (const layer of this.layers) {",
    "      output = layer.forward(output);",
    "    }",
    "    return output;",
    "  }",
    "}",
    "export default NeuralNet;",
    "const config = {",
    "  temperature: 0.7,",
    "  topP: 0.9,",
    "};",
    "await db.connect(uri);",
    "const users = await User",
    "  .findAll({ active: true });",
    "export { init, run };",
  ];

  const codeLinesRight = [
    "const workflow = {",
    "  steps: ['parse', 'plan',",
    "    'execute', 'verify']",
    "};",
    "import express from 'express';",
    "const app = express();",
    "app.use(cors());",
    "app.listen(3000);",
    "async function handler(req) {",
    "  const data = await parse(req);",
    "  const model = loadModel('llm');",
    "  const response = await model",
    "    .generate(data.prompt);",
    "  return response;",
    "}",
    "const router = new Router();",
    "router.get('/api/data', handler);",
    "export default router;",
    "class Agent {",
    "  constructor(opts) {",
    "    this.opts = opts;",
    "    this.memory = new Map();",
    "  }",
    "  async think(input) {",
    "    const ctx = this.memory.get('ctx');",
    "    return this.llm.complete(",
    "      input, ctx",
    "    );",
    "  }",
    "}",
  ];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      zIndex: 0,
      pointerEvents: "none",
    }}>
      {/* Deep dark base */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "#030305",
      }} />

      {/* Ambient glows */}
      <div style={{
        position: "absolute",
        top: "-20%",
        left: "-10%",
        width: "60%",
        height: "60%",
        background: "radial-gradient(ellipse, rgba(155,92,255,0.08) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "-5%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(ellipse, rgba(79,195,247,0.06) 0%, transparent 60%)",
        filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        left: "20%",
        width: "40%",
        height: "30%",
        background: "radial-gradient(ellipse, rgba(155,92,255,0.1) 0%, transparent 50%)",
        filter: "blur(30px)",
      }} />

      {/* Left code column */}
      <div style={{
        position: "absolute",
        left: "0%",
        top: 0,
        bottom: 0,
        width: "22%",
        overflow: "hidden",
      }}>
        <div style={{
          animation: "codeScroll 30s linear infinite",
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          fontSize: 10,
          lineHeight: 1.8,
          color: "rgba(0, 200, 180, 0.15)",
          whiteSpace: "pre",
          direction: "ltr",
        }}>
          {[...codeLinesLeft, ...codeLinesLeft].map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {/* Right code column */}
      <div style={{
        position: "absolute",
        right: "0%",
        top: 0,
        bottom: 0,
        width: "18%",
        overflow: "hidden",
      }}>
        <div style={{
          animation: "codeScroll 35s linear infinite",
          animationDelay: "-10s",
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          fontSize: 10,
          lineHeight: 1.8,
          color: "rgba(79,195,247,0.12)",
          whiteSpace: "pre",
          direction: "ltr",
        }}>
          {[...codeLinesRight, ...codeLinesRight].map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {/* Neon city reflection at bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "25%",
        background: `
          linear-gradient(to top, rgba(155,92,255,0.15) 0%, transparent 100%),
          linear-gradient(to top, rgba(79,195,247,0.08) 0%, transparent 60%)
        `,
      }} />

      {/* Ground reflection lines */}
      <div style={{
        position: "absolute",
        bottom: "8%",
        left: "5%",
        right: "5%",
        height: "1px",
        background: "linear-gradient(to right, transparent, rgba(155,92,255,0.3), rgba(79,195,247,0.2), transparent)",
      }} />
      <div style={{
        position: "absolute",
        bottom: "5%",
        left: "10%",
        right: "10%",
        height: "1px",
        background: "linear-gradient(to right, transparent, rgba(79,195,247,0.15), transparent)",
      }} />

      {/* Vertical neon lines on sides */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: "3%",
        width: "2px",
        height: "35%",
        background: "linear-gradient(to top, rgba(155,92,255,0.3), transparent)",
        filter: "blur(2px)",
      }} />
      <div style={{
        position: "absolute",
        bottom: 0,
        right: "4%",
        width: "2px",
        height: "40%",
        background: "linear-gradient(to top, rgba(79,195,247,0.2), transparent)",
        filter: "blur(2px)",
      }} />
      <div style={{
        position: "absolute",
        bottom: 0,
        right: "8%",
        width: "1.5px",
        height: "30%",
        background: "linear-gradient(to top, rgba(224,64,251,0.2), transparent)",
        filter: "blur(1px)",
      }} />

      {/* Neon dots / light sources */}
      <div style={{
        position: "absolute",
        bottom: "18%",
        left: "3%",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: PURPLE_BRIGHT,
        boxShadow: `0 0 10px ${PURPLE}, 0 0 20px ${PURPLE}`,
        animation: "neonFlicker 3s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "22%",
        right: "4%",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: BLUE_GLOW,
        boxShadow: `0 0 8px ${BLUE_GLOW}, 0 0 16px rgba(79,195,247,0.4)`,
        animation: "neonFlicker 4s ease-in-out infinite",
        animationDelay: "-1s",
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "9%",
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: NEON_PINK,
        boxShadow: `0 0 6px ${NEON_PINK}`,
        animation: "neonFlicker 5s ease-in-out infinite",
        animationDelay: "-2s",
      }} />

      {/* Top decorative elements */}
      <div style={{
        position: "absolute",
        top: "5%",
        left: "2%",
        width: "15%",
        height: "2px",
        background: "linear-gradient(to right, rgba(155,92,255,0.3), transparent)",
      }} />
      <div style={{
        position: "absolute",
        top: "8%",
        right: "3%",
        width: "12%",
        height: "2px",
        background: "linear-gradient(to left, rgba(79,195,247,0.2), transparent)",
      }} />

      {/* Wet ground reflection effect */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: "15%",
        right: "15%",
        height: "15%",
        background: `
          radial-gradient(ellipse 100% 50% at 50% 100%, rgba(155,92,255,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 80% 40% at 30% 100%, rgba(79,195,247,0.08) 0%, transparent 50%),
          radial-gradient(ellipse 60% 30% at 70% 100%, rgba(224,64,251,0.06) 0%, transparent 50%)
        `,
      }} />
    </div>
  );
}

// ── 3D Glass Logo Ring ─────────────────────────────────────────────────────────

function KodakLogo({ authenticating }: { authenticating: boolean }) {
  return (
    <div style={{
      position: "relative",
      width: 260,
      height: 260,
      margin: "0 auto 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Outer metallic ring - 3D effect */}
      <div style={{
        position: "absolute",
        width: 240,
        height: 240,
        borderRadius: "50%",
        top: "50%",
        left: "50%",
        animation: "ringRotate 25s linear infinite",
        transformOrigin: "center center",
      }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="outerRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(155,92,255,0.6)" />
              <stop offset="30%" stopColor="rgba(155,92,255,0.15)" />
              <stop offset="50%" stopColor="rgba(79,195,247,0.4)" />
              <stop offset="70%" stopColor="rgba(155,92,255,0.15)" />
              <stop offset="100%" stopColor="rgba(155,92,255,0.5)" />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="115" fill="none" stroke="url(#outerRing)" strokeWidth="3" />
          {/* Segment breaks */}
          <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(155,92,255,0.8)" strokeWidth="4" strokeDasharray="60 180 40 200 80 100" strokeLinecap="round" />
          {/* Inner accent */}
          <circle cx="120" cy="120" r="112" fill="none" stroke="rgba(79,195,247,0.3)" strokeWidth="1" />
        </svg>
      </div>

      {/* Middle ring - reverse rotation */}
      <div style={{
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: "50%",
        top: "50%",
        left: "50%",
        animation: "ringRotateReverse 18s linear infinite",
        transformOrigin: "center center",
      }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="midRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79,195,247,0.5)" />
              <stop offset="40%" stopColor="rgba(79,195,247,0.1)" />
              <stop offset="60%" stopColor="rgba(155,92,255,0.4)" />
              <stop offset="100%" stopColor="rgba(79,195,247,0.3)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke="url(#midRing)" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(155,92,255,0.6)" strokeWidth="3" strokeDasharray="30 120 50 180" strokeLinecap="round" />
        </svg>
      </div>

      {/* Inner decorative ring */}
      <div style={{
        position: "absolute",
        width: 170,
        height: 170,
        borderRadius: "50%",
        top: "50%",
        left: "50%",
        animation: "ringRotate 12s linear infinite",
        transformOrigin: "center center",
      }}>
        <svg width="170" height="170" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r="82" fill="none" stroke="rgba(155,92,255,0.25)" strokeWidth="1.5" strokeDasharray="10 50 20 80" strokeLinecap="round" />
          <circle cx="85" cy="85" r="82" fill="none" stroke="rgba(224,64,251,0.15)" strokeWidth="1" />
        </svg>
      </div>

      {/* Inner glow */}
      <div style={{
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: "50%",
        top: "50%",
        left: "50%",
        background: "radial-gradient(circle, rgba(155,92,255,0.12) 0%, rgba(79,195,247,0.06) 40%, transparent 70%)",
        transform: "translate(-50%, -50%)",
        animation: authenticating ? "glowPulse 1.5s ease-in-out infinite" : "glowPulse 4s ease-in-out infinite",
      }} />

      {/* Center content */}
      <div style={{
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        animation: "float 6s ease-in-out infinite",
      }}>
        {/* </> icon */}
        <div style={{
          fontSize: 52,
          fontWeight: 900,
          background: "linear-gradient(135deg, #9B5CFF 0%, #B07CFF 40%, #E040FB 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: authenticating ? "drop-shadow(0 0 15px rgba(155,92,255,0.8))" : "drop-shadow(0 0 10px rgba(155,92,255,0.5))",
          lineHeight: 1,
          marginBottom: 4,
          direction: "ltr",
        }}>
          {"</>"}
        </div>
        {/* Arabic brand name */}
        <div style={{
          fontSize: 38,
          fontWeight: 900,
          color: "#FFFFFF",
          textShadow: "0 0 20px rgba(155,92,255,0.4), 0 0 40px rgba(155,92,255,0.2)",
          direction: "rtl",
          lineHeight: 1.1,
          marginBottom: 4,
        }}>
          كودك
        </div>
        {/* Tagline */}
        <div style={{
          fontSize: 14,
          color: PURPLE_BRIGHT,
          direction: "rtl",
          fontWeight: 500,
          textShadow: "0 0 10px rgba(155,92,255,0.3)",
        }}>
          {"_> طوّر فكرتك بكود"}
        </div>
      </div>
    </div>
  );
}

// ── Input Field ────────────────────────────────────────────────────────────────

interface InputFieldProps {
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

function InputField({ id, placeholder, type, autoComplete, icon, suffix, error, hasError, registration }: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 14, direction: "rtl" }}>
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
      }}>
        <div style={{
          position: "relative",
          width: "100%",
          height: 54,
          borderRadius: 14,
          background: "rgba(10,10,20,0.85)",
          border: `1px solid ${
            hasError ? "rgba(255,60,60,0.5)"
            : focused ? "rgba(155,92,255,0.5)"
            : "rgba(155,92,255,0.2)"
          }`,
          boxShadow: focused
            ? "0 0 15px rgba(155,92,255,0.1), inset 0 0 10px rgba(155,92,255,0.03)"
            : hasError
            ? "0 0 10px rgba(255,60,60,0.08)"
            : "none",
          transition: "all 0.3s ease",
          overflow: "hidden",
        }}>
          {/* Subtle gradient top edge */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: focused
              ? "linear-gradient(to right, transparent, rgba(155,92,255,0.4), transparent)"
              : "linear-gradient(to right, transparent, rgba(155,92,255,0.15), transparent)",
            transition: "background 0.3s",
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
              padding: suffix ? "0 48px 0 16px" : "0 48px 0 16px",
              fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
              caretColor: PURPLE_BRIGHT,
              textAlign: "right",
              direction: "rtl",
              zIndex: 1,
            }}
            {...registration}
          />

          {/* Right icon */}
          <div style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? PURPLE_BRIGHT : "rgba(155,92,255,0.35)",
            transition: "color 0.3s",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
          }}>
            {icon}
          </div>

          {/* Suffix (eye) */}
          {suffix && (
            <div style={{
              position: "absolute",
              left: 14,
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
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.14 }}
            style={{
              fontSize: 12,
              color: "#FF4444",
              margin: "4px 0 0 8px",
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(176,124,255,0.5)" }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(176,124,255,0.35)" }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Login Button ───────────────────────────────────────────────────────────────

function LoginButton({ loading, disabled }: { loading: boolean; disabled: boolean }) {
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
        borderRadius: 28,
        background: hovered && !disabled
          ? "linear-gradient(135deg, rgba(155,92,255,0.9) 0%, rgba(176,124,255,0.85) 50%, rgba(224,64,251,0.8) 100%)"
          : "linear-gradient(135deg, rgba(155,92,255,0.7) 0%, rgba(176,124,255,0.65) 50%, rgba(224,64,251,0.6) 100%)",
        border: "1px solid rgba(155,92,255,0.4)",
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
        letterSpacing: "0.08em",
        direction: "rtl",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        animation: loading ? "buttonGlow 1.5s ease-in-out infinite" : "none",
        boxShadow: !loading ? (
          hovered && !disabled
            ? "0 0 25px rgba(155,92,255,0.4), 0 0 50px rgba(79,195,247,0.2)"
            : "0 0 15px rgba(155,92,255,0.25), 0 0 30px rgba(79,195,247,0.1)"
        ) : undefined,
        transform: hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {/* Arrow icon (pointing left in RTL) */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 5l-7 7 7 7" />
      </svg>
      <span>{loading ? "جاري..." : "دخول"}</span>
    </button>
  );
}

// ── OAuth Icons ────────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#FFFFFF">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" width="22" height="22">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

type OAuthProvider = "google" | "github" | "microsoft";

function OAuthCircleBtn({
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
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: hovered && !disabled
          ? "rgba(155,92,255,0.15)"
          : "rgba(155,92,255,0.06)",
        border: `1px solid ${hovered ? "rgba(155,92,255,0.4)" : "rgba(155,92,255,0.12)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.3s ease",
        boxShadow: hovered && !disabled ? "0 0 15px rgba(155,92,255,0.2)" : "none",
      }}
      aria-label={`Continue with ${cfg.label}`}
      title={cfg.label}
    >
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(176,124,255,0.6)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : cfg.icon}
    </button>
  );
}

// ── Cyber Link ─────────────────────────────────────────────────────────────────

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
        }}
      >
        {children}
      </span>
    </Link>
  );
}

// ── Icons for inputs ───────────────────────────────────────────────────────────

const UserIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

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
        // Navigation is handled by the useEffect above that watches isAuthenticated.
        // Calling setLocation here immediately after authenticate() can cause a race
        // where ProtectedRoute renders before AuthProvider's state update propagates,
        // sees isAuthenticated=false, and redirects back to /login.
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

  return (
    <>
      {/* ── Background ── */}
      <CyberpunkBackground />

      {/* ── Main content ── */}
      <AnimatePresence>
        {pageReady && (
          <motion.div
            key="login-page"
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
              padding: "40px 20px",
              direction: "rtl",
            }}
          >
            {/* ── Logo ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ marginBottom: 8 }}
            >
              <KodakLogo authenticating={isPending} />
            </motion.div>

            {/* ── Email Input ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <InputField
                id="email"
                placeholder="البريد الإلكتروني أو اسم المستخدم"
                type="text"
                autoComplete="username"
                icon={UserIcon}
                error={errors.email?.message}
                hasError={!!errors.email}
                registration={form.register("email")}
              />
            </motion.div>

            {/* ── Password Input ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <InputField
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
                      color: "rgba(176,124,255,0.35)",
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(176,124,255,0.7)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(176,124,255,0.35)")}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                }
              />
            </motion.div>

            {/* ── Forgot Password ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.45 }}
              style={{
                width: "100%",
                maxWidth: 380,
                textAlign: "right",
                marginBottom: 20,
              }}
            >
              <CyberLink href="/forgot-password">نسيت كلمة المرور؟</CyberLink>
            </motion.div>

            {/* ── Login Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <LoginButton
                  loading={isPending}
                  disabled={isPending || anyOAuthLoading}
                />
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
                      margin: "8px 0 0",
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
              transition={{ duration: 0.3, delay: 0.6 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: "100%",
                maxWidth: 380,
                margin: "22px 0",
              }}
            >
              <div style={{
                flex: 1,
                height: 1,
                background: "linear-gradient(to right, transparent, rgba(155,92,255,0.3))",
              }} />
              <span style={{
                color: "rgba(155,92,255,0.5)",
                fontSize: 14,
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
              transition={{ duration: 0.4, delay: 0.65 }}
              style={{
                display: "flex",
                gap: 20,
                justifyContent: "center",
              }}
            >
              <OAuthCircleBtn
                provider="github"
                loading={loadingOAuth === "github"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("github")}
              />
              <OAuthCircleBtn
                provider="google"
                loading={loadingOAuth === "google"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("google")}
              />
              <OAuthCircleBtn
                provider="microsoft"
                loading={loadingOAuth === "microsoft"}
                disabled={anyOAuthLoading || isPending}
                onClick={() => handleOAuth("microsoft")}
              />
            </motion.div>

            {/* ── Sign up ── */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.75 }}
              style={{
                textAlign: "center",
                marginTop: 28,
                marginBottom: 0,
                direction: "rtl",
              }}
            >
              <span style={{ color: "rgba(200,200,220,0.6)", fontSize: 14 }}>
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
