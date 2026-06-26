/**
 * VerificationCard
 *
 * The ✅ Project Ready success card shown in chat after all verification passes.
 * Only rendered once every check has passed.
 *
 * Shows:
 *   - Status header (✅ Project Ready)
 *   - 8-check grid (Build, Typecheck, Runtime, API, Database, Frontend, Tests, Preview Running)
 *   - Open Preview button
 */

import { useState } from "react";
import type { VerificationCheck, ExecPhase } from "@/lib/task-store";

// ── Icons ──────────────────────────────────────────────────────────────────────

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <polyline
        points="1.5,5 3.5,7.5 8.5,2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="none">
      <line x1="1.5" y1="1.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7.5" y1="1.5" x2="1.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SkipIcon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="none">
      <line x1="2" y1="4.5" x2="7" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 6h8M6.5 2l4 4-4 4" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4.5 2H2.5A1 1 0 001.5 3v6A1 1 0 002.5 10h6a1 1 0 001-1V7" />
      <path d="M6.5 1.5h3v3" />
      <line x1="9.5" y1="1.5" x2="5" y2="6" />
    </svg>
  );
}

// ── Check row ──────────────────────────────────────────────────────────────────

interface CheckRowProps {
  check: VerificationCheck;
  index: number;
}

function CheckRow({ check, index }: CheckRowProps) {
  const isPassed = check.status === "pass" || check.status === "fixed";
  const isFailed = check.status === "fail";
  const isSkipped = check.status === "skip";

  return (
    <div
      className="verify-check-row flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all"
      style={{
        animationDelay: `${index * 60}ms`,
        borderColor: isPassed ? "rgb(34 197 94 / 0.25)" : isFailed ? "rgb(239 68 68 / 0.25)" : "rgb(var(--border) / 0.5)",
        background: isPassed ? "rgb(34 197 94 / 0.04)" : isFailed ? "rgb(239 68 68 / 0.04)" : "transparent",
      }}
    >
      {/* Status dot */}
      <div
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: isPassed
            ? "rgb(34 197 94 / 0.18)"
            : isFailed
            ? "rgb(239 68 68 / 0.18)"
            : "rgb(var(--muted) / 0.5)",
          color: isPassed
            ? "rgb(74 222 128)"
            : isFailed
            ? "rgb(248 113 113)"
            : "rgb(var(--muted-foreground) / 0.5)",
        }}
      >
        {isPassed ? <CheckIcon /> : isFailed ? <CrossIcon /> : <SkipIcon />}
      </div>

      {/* Name */}
      <span className="flex-1 text-xs font-medium text-foreground/80">{check.name}</span>

      {/* Detail */}
      {check.detail && (
        <span className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[100px]">
          {check.detail}
        </span>
      )}

      {/* Status badge */}
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{
          background: isPassed
            ? "rgb(34 197 94 / 0.12)"
            : isFailed
            ? "rgb(239 68 68 / 0.12)"
            : "rgb(var(--muted) / 0.5)",
          color: isPassed
            ? "rgb(74 222 128)"
            : isFailed
            ? "rgb(248 113 113)"
            : "rgb(var(--muted-foreground) / 0.5)",
        }}
      >
        {isSkipped ? "skip" : isPassed ? "✔" : "✗"}
      </span>
    </div>
  );
}

// ── Phase summary row ──────────────────────────────────────────────────────────

function PhaseBar({ phases }: { phases: ExecPhase[] }) {
  const completed = phases.filter((p) => p.status === "complete").length;
  const total = phases.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
      <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground/50">
        {completed}/{total} phases
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface VerificationCardProps {
  checks: VerificationCheck[];
  phases?: ExecPhase[];
  allPassed: boolean;
  onPreview?: () => void;
}

export function VerificationCard({ checks, phases, allPassed, onPreview }: VerificationCardProps) {
  const [previewOpened, setPreviewOpened] = useState(false);

  const passCount  = checks.filter((c) => c.status === "pass" || c.status === "fixed").length;
  const failCount  = checks.filter((c) => c.status === "fail").length;
  const skipCount  = checks.filter((c) => c.status === "skip").length;

  const handlePreview = () => {
    setPreviewOpened(true);
    onPreview?.();
  };

  return (
    <div className="verification-card-enter rounded-xl border overflow-hidden shadow-lg"
      style={{
        borderColor: allPassed ? "rgb(34 197 94 / 0.35)" : "rgb(239 68 68 / 0.35)",
        background: "var(--card)",
      }}
    >
      {/* Top glow stripe */}
      <div
        className="h-0.5"
        style={{
          background: allPassed
            ? "linear-gradient(to right, transparent, rgb(34 197 94 / 0.8), transparent)"
            : "linear-gradient(to right, transparent, rgb(239 68 68 / 0.8), transparent)",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40"
        style={{ background: allPassed ? "rgb(34 197 94 / 0.05)" : "rgb(239 68 68 / 0.05)" }}
      >
        {/* Big check or X */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          style={{
            background: allPassed ? "rgb(34 197 94 / 0.2)" : "rgb(239 68 68 / 0.2)",
            boxShadow: allPassed ? "0 0 12px rgb(34 197 94 / 0.3)" : "0 0 12px rgb(239 68 68 / 0.3)",
          }}
        >
          {allPassed ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "rgb(74 222 128)" }}>
              <polyline points="2,7 5,10.5 12,3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "rgb(248 113 113)" }}>
              <line x1="2.5" y1="2.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="11.5" y1="2.5" x2="2.5" y2="11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {allPassed ? "Project Ready" : "Verification Incomplete"}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {passCount} passed · {skipCount} skipped{failCount > 0 ? ` · ${failCount} failed` : ""}
          </p>
        </div>

        {allPassed && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: "rgb(34 197 94 / 0.15)", color: "rgb(74 222 128)" }}
          >
            ✅ READY
          </span>
        )}
      </div>

      {/* Phase bar */}
      {phases && phases.length > 0 && <PhaseBar phases={phases} />}

      {/* Check grid */}
      <div className="grid grid-cols-1 gap-1.5 p-3">
        {checks.map((check, i) => (
          <CheckRow key={check.id} check={check} index={i} />
        ))}
      </div>

      {/* Preview button — only shown when all passed */}
      {allPassed && (
        <div className="px-3 pb-3">
          <button
            onClick={handlePreview}
            disabled={previewOpened}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background: previewOpened
                ? "rgb(34 197 94 / 0.1)"
                : "linear-gradient(135deg, rgb(34 197 94 / 0.85), rgb(16 185 129 / 0.85))",
              color: previewOpened ? "rgb(74 222 128)" : "#000",
              boxShadow: previewOpened ? "none" : "0 2px 12px rgb(34 197 94 / 0.25)",
            }}
          >
            {previewOpened ? (
              <>
                <CheckIcon size={12} />
                Preview Open
              </>
            ) : (
              <>
                <ExternalIcon />
                Open Preview
                <OpenIcon />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── In-progress card (shown during verification) ──────────────────────────────

interface VerificationProgressProps {
  checks: VerificationCheck[];
  phases: ExecPhase[];
  currentPhase?: ExecPhase;
}

export function VerificationProgress({ checks, phases, currentPhase }: VerificationProgressProps) {
  const doneChecks = checks.filter((c) => c.status === "pass" || c.status === "fail" || c.status === "skip" || c.status === "fixed");
  const isFixing = checks.some((c) => c.status === "fixing");

  return (
    <div className="rounded-xl border border-primary/20 overflow-hidden bg-card/60">
      {/* Active glow line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/40 bg-primary/5">
        <div className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-primary/20" />
          <span className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-xs font-semibold text-foreground">
          {isFixing ? "Auto-fixing issues…" : currentPhase ? currentPhase.name : "Verifying project…"}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          {doneChecks.length}/{checks.length}
        </span>
      </div>

      {/* Phase progress */}
      {phases.length > 0 && (
        <div className="flex gap-1 px-3 py-2 border-b border-border/30">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background:
                  phase.status === "complete"
                    ? "rgb(34 197 94 / 0.7)"
                    : phase.status === "running"
                    ? "rgb(var(--primary) / 0.8)"
                    : phase.status === "failed"
                    ? "rgb(239 68 68 / 0.5)"
                    : "rgb(var(--muted) / 0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* Check list (show only settled checks) */}
      {doneChecks.length > 0 && (
        <div className="flex flex-col gap-1 p-2">
          {checks.slice(0, doneChecks.length).map((check, i) => (
            <CheckRow key={check.id} check={check} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
