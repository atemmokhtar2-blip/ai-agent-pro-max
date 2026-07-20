/**
 * LiveExecutionView — Professional Live Development Workspace
 *
 * Replaces the TypingBubble during execution phases.
 * Every visual update corresponds to a real backend SSE event.
 * No fake progress. No silent waiting. No frozen screen.
 */

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExecPhase, VerificationCheck, HealthReport } from "@/lib/task-store";

// ── Stage grouping ────────────────────────────────────────────────────────────

const PHASE_GROUPS = [
  { label: "Planning",     ids: [1, 2],              color: "text-violet-400",  border: "border-violet-500/30",  bg: "bg-violet-500/8"  },
  { label: "Build",        ids: [3, 4, 5, 6, 7, 8, 9], color: "text-amber-400", border: "border-amber-500/30",   bg: "bg-amber-500/8"   },
  { label: "Verification", ids: [10,11,12,13,14,15,16,17], color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/8"    },
] as const;

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function useLiveTimer(startedAt?: string, completedAt?: string): string {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    if (completedAt) {
      setElapsed(new Date(completedAt).getTime() - new Date(startedAt).getTime());
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startedAt, completedAt]);
  return elapsed > 0 ? formatDuration(elapsed) : "";
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1.5,5 4,7.5 8.5,2" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  );
}

function IconSpinner({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <path d="M5 1.5A3.5 3.5 0 1 1 1.5 5" />
    </svg>
  );
}

function IconPulse({ color = "bg-primary" }: { color?: string }) {
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${color} animate-pulse`} />
  );
}

// ── Stage pill ────────────────────────────────────────────────────────────────

const StagePill = memo(function StagePill({
  phase,
  isActive,
}: {
  phase: ExecPhase;
  isActive: boolean;
}) {
  const status = phase.status;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-[11px] font-medium transition-all duration-200 ${
        status === "running"
          ? "bg-primary/12 border-primary/30 text-primary"
          : status === "complete"
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          : status === "failed"
          ? "bg-red-500/10 border-red-500/25 text-red-400"
          : isActive
          ? "bg-muted/20 border-border/40 text-muted-foreground/70"
          : "bg-transparent border-border/20 text-muted-foreground/30"
      }`}
    >
      <span className="flex-shrink-0">
        {status === "running" ? (
          <IconSpinner size={9} />
        ) : status === "complete" ? (
          <span className="text-emerald-400"><IconCheck /></span>
        ) : status === "failed" ? (
          <span className="text-red-400"><IconX /></span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full border border-current opacity-40 inline-block" />
        )}
      </span>
      {phase.label}
      {status === "complete" && phase.duration && (
        <span className="text-[9px] text-emerald-400/50 tabular-nums font-mono">
          {formatDuration(phase.duration)}
        </span>
      )}
    </motion.div>
  );
});

// ── Overall progress bar ──────────────────────────────────────────────────────

function OverallProgress({ phases, isVerifying }: { phases: ExecPhase[]; isVerifying: boolean }) {
  const completed = phases.filter(p => p.status === "complete").length;
  const running = phases.filter(p => p.status === "running").length;
  const total = phases.length;
  const pct = total === 0 ? 0 : Math.min(99, Math.round(((completed + running * 0.5) / total) * 100));
  const activePhaseName = phases.find(p => p.status === "running")?.name ?? (isVerifying ? "Verifying" : "Building");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconPulse color="bg-primary" />
          <span className="text-[11px] font-semibold text-foreground/80 tracking-wide uppercase">
            {activePhaseName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
            {completed}/{total}
          </span>
          <span className="text-sm font-semibold text-primary tabular-nums font-mono">
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/20 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Terminal ──────────────────────────────────────────────────────────────────

const Terminal = memo(function Terminal({
  stageId,
  stageName,
  logs,
  isRunning,
}: {
  stageId: number;
  stageName: string;
  logs: string[];
  isRunning: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (logs.length === 0 && !isRunning) return null;

  // Stage icons
  const stageIcon: Record<number, string> = {
    3: "📦", 4: "🔨", 5: "🔍", 6: "📐", 7: "🧪",
    8: "🚀", 9: "📦", 15: "🔧", 16: "🔄",
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-border/30 bg-[#0d0d0d] overflow-hidden"
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#111]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/40 ml-1">
          {stageIcon[stageId] ?? "⚙"} {stageName}
        </span>
        {isRunning && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-primary/60">
            <IconPulse color="bg-primary" />
            running
          </span>
        )}
      </div>
      {/* Terminal body */}
      <div className="max-h-40 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px] leading-relaxed">
        <AnimatePresence initial={false}>
          {logs.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={
                /error|failed|✗|ERR_/i.test(line)
                  ? "text-red-400/80"
                  : /warn|warning/i.test(line)
                  ? "text-amber-400/70"
                  : /✓|success|done|complete/i.test(line)
                  ? "text-emerald-400/80"
                  : "text-muted-foreground/55"
              }
            >
              <span className="text-muted-foreground/20 mr-2 select-none">$</span>
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
        {isRunning && (
          <motion.div
            className="flex items-center gap-1.5 text-muted-foreground/30"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          >
            <span className="select-none text-muted-foreground/20">$</span>
            <span className="inline-block h-3 w-2 bg-primary/40 rounded-sm" />
          </motion.div>
        )}
        <div ref={endRef} />
      </div>
    </motion.div>
  );
});

// ── Verification checks ───────────────────────────────────────────────────────

const CHECK_ICONS: Record<VerificationCheck["status"], { icon: React.ReactNode; cls: string }> = {
  pending:  { icon: <span className="h-1.5 w-1.5 rounded-full border border-current opacity-30 inline-block" />, cls: "text-muted-foreground/25" },
  checking: { icon: <IconSpinner size={9} />,  cls: "text-primary animate-pulse" },
  pass:     { icon: <IconCheck />,              cls: "text-emerald-400" },
  fail:     { icon: <IconX />,                  cls: "text-red-400" },
  skip:     { icon: <span className="font-mono text-[10px]">—</span>, cls: "text-muted-foreground/25" },
  fixing:   { icon: <IconSpinner size={9} />,   cls: "text-orange-400" },
  fixed:    { icon: <IconCheck />,              cls: "text-teal-400" },
};

const DOMAIN_ORDER = ["build", "typescript", "frontend", "backend", "database", "routing", "security"];

function VerifyChecklist({ checks }: { checks: VerificationCheck[] }) {
  const grouped: Record<string, VerificationCheck[]> = {};
  for (const c of checks) {
    const d = c.domain ?? "other";
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(c);
  }

  const activeChecks = checks.filter(c => c.status !== "pending");
  if (activeChecks.length === 0) return null;

  const domains = [...DOMAIN_ORDER, ...Object.keys(grouped).filter(d => !DOMAIN_ORDER.includes(d))].filter(d => grouped[d]);

  return (
    <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" className="text-cyan-400">
          <path d="M7 1.5L2 3.5v4.5c0 2.5 2.2 4.8 5 5.5 2.8-.7 5-3 5-5.5V3.5L7 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/70">Verification</span>
        <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">
          {checks.filter(c => c.status === "pass" || c.status === "fixed").length}/{checks.filter(c => c.status !== "pending" && c.status !== "skip").length} passed
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {domains.map(domain => (
          <div key={domain}>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/30 mb-1 mt-1">
              {domain}
            </div>
            {(grouped[domain] ?? []).map(check => {
              const cfg = CHECK_ICONS[check.status] ?? CHECK_ICONS.pending;
              return (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 py-0.5"
                >
                  <span className={`flex-shrink-0 w-3 flex items-center justify-center ${cfg.cls}`}>
                    {cfg.icon}
                  </span>
                  <span className={`text-[11px] truncate ${check.status === "pending" ? "text-muted-foreground/25" : "text-foreground/65"}`}>
                    {check.name}
                  </span>
                  {check.status === "fail" && check.detail && (
                    <span className="text-[10px] text-red-400/60 truncate hidden sm:block max-w-[100px]">
                      {check.detail.slice(0, 40)}
                    </span>
                  )}
                  {check.status === "fixing" && (
                    <span className="text-[9px] text-orange-400/70 ml-auto flex-shrink-0">Retrying…</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Health report ─────────────────────────────────────────────────────────────

function HealthReportCard({ report }: { report: HealthReport }) {
  const pct = report.overallScore;
  const isReady = report.productionReady;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 space-y-3 ${isReady ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold ${isReady ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
          {pct}
        </div>
        <div>
          <div className={`text-sm font-semibold ${isReady ? "text-emerald-400" : "text-amber-400"}`}>
            {isReady ? "Production Ready" : "Build Complete"}
          </div>
          <div className="text-[10px] text-muted-foreground/50">
            {report.passedChecks} passed · {report.failedChecks} failed · {report.skippedChecks} skipped
            {report.fixesApplied > 0 && ` · ${report.fixesApplied} auto-fixed`}
          </div>
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground/30 font-mono">
          Health Score
        </div>
      </div>

      {/* Domain scores */}
      <div className="grid grid-cols-3 gap-2">
        {report.domains.filter(d => d.status !== "skip").map(domain => (
          <div key={domain.domain} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40">{domain.label}</span>
              <span className={`text-[10px] font-mono font-semibold ${domain.status === "pass" ? "text-emerald-400" : domain.status === "fail" ? "text-red-400" : "text-amber-400"}`}>
                {domain.score}%
              </span>
            </div>
            <div className="h-0.5 w-full rounded-full bg-border/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${domain.status === "pass" ? "bg-emerald-500/60" : domain.status === "fail" ? "bg-red-500/60" : "bg-amber-500/60"}`}
                initial={{ width: 0 }}
                animate={{ width: `${domain.score}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Stage group section ───────────────────────────────────────────────────────

function StageGroup({
  group,
  phases,
}: {
  group: typeof PHASE_GROUPS[number];
  phases: ExecPhase[];
}) {
  const groupPhases = phases.filter(p => (group.ids as readonly number[]).includes(p.id));
  if (groupPhases.length === 0) return null;

  const hasActive = groupPhases.some(p => p.status === "running");
  const allPending = groupPhases.every(p => p.status === "pending");
  const allDone = groupPhases.every(p => p.status === "complete" || p.status === "skipped");
  const hasFailed = groupPhases.some(p => p.status === "failed");

  return (
    <div className={`space-y-2 transition-opacity duration-300 ${allPending ? "opacity-35" : "opacity-100"}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-semibold uppercase tracking-widest ${
          allDone ? "text-emerald-400/60" : hasFailed ? "text-red-400/60" : hasActive ? group.color + "/80" : "text-muted-foreground/30"
        }`}>
          {group.label}
        </span>
        <div className={`flex-1 h-px ${allPending ? "bg-border/10" : "bg-border/20"}`} />
        {allDone && <span className="text-[9px] text-emerald-400/50">✓</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {groupPhases.map(phase => (
          <StagePill key={phase.id} phase={phase} isActive={hasActive || allDone} />
        ))}
      </div>
    </div>
  );
}

// ── Execution notification toasts ─────────────────────────────────────────────

interface Notification {
  id: string;
  message: string;
  kind: "success" | "info" | "error";
}

function NotificationToast({ note, onDone }: { note: Notification; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm ${
        note.kind === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : note.kind === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-primary/30 bg-primary/10 text-primary/90"
      }`}
    >
      {note.kind === "success" ? (
        <span className="text-emerald-400"><IconCheck /></span>
      ) : note.kind === "error" ? (
        <span className="text-red-400"><IconX /></span>
      ) : (
        <IconPulse color="bg-primary" />
      )}
      {note.message}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface LiveExecutionViewProps {
  phases: ExecPhase[];
  checks: VerificationCheck[];
  stageLogs: Map<number, string[]>;
  activeStageId: number | null;
  healthReport?: HealthReport | null;
  isVerifying: boolean;
  userMessage: string;
}

export const LiveExecutionView = memo(function LiveExecutionView({
  phases,
  checks,
  stageLogs,
  activeStageId,
  healthReport,
  isVerifying,
  userMessage,
}: LiveExecutionViewProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastCompletedRef = useRef<Set<number>>(new Set());
  const lastVerifyPassRef = useRef<Set<string>>(new Set());

  // ── Fire notifications on stage completions ──────────────────────────────
  useEffect(() => {
    const STAGE_MESSAGES: Record<number, string> = {
      2:  "Files generated",
      3:  "Dependencies installed",
      4:  "Build succeeded",
      7:  "Tests passed",
      9:  "Production bundle ready",
    };
    for (const phase of phases) {
      if (phase.status === "complete" && !lastCompletedRef.current.has(phase.id) && STAGE_MESSAGES[phase.id]) {
        lastCompletedRef.current.add(phase.id);
        setNotifications(n => [...n, {
          id: `stage-${phase.id}-${Date.now()}`,
          message: STAGE_MESSAGES[phase.id],
          kind: "success",
        }]);
      }
    }
  }, [phases]);

  // ── Fire notifications on key verify checks ──────────────────────────────
  useEffect(() => {
    const KEY_CHECKS = ["build_success", "db_connection", "runtime_errors"];
    for (const check of checks) {
      if (check.status === "pass" && !lastVerifyPassRef.current.has(check.id) && KEY_CHECKS.includes(check.id)) {
        lastVerifyPassRef.current.add(check.id);
        setNotifications(n => [...n, {
          id: `check-${check.id}-${Date.now()}`,
          message: check.name + " ✓",
          kind: "success",
        }]);
      }
    }
  }, [checks]);

  const dismissNotification = (id: string) => setNotifications(n => n.filter(x => x.id !== id));

  // Active stage info for terminal
  const activePhase = activeStageId != null ? phases.find(p => p.id === activeStageId) : null;
  const terminalLogs = activeStageId != null ? (stageLogs.get(activeStageId) ?? []) : [];
  const isTerminalRunning = activePhase?.status === "running";

  // Show terminal for build/install/debug stages
  const terminalStages = new Set([3, 4, 5, 6, 7, 8, 9, 15, 16]);
  const showTerminal = activeStageId != null && terminalStages.has(activeStageId) && (terminalLogs.length > 0 || isTerminalRunning);

  const activeChecks = checks.filter(c => c.status !== "pending");

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 border border-primary/20 mt-0.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-primary">
          <path d="M8 2L9.8 6.2L14 8L9.8 9.8L8 14L6.2 9.8L2 8L6.2 6.2L8 2Z" fill="currentColor" opacity="0.9" />
        </svg>
      </div>

      {/* Main card */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Execution card */}
        <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
          {/* Animated top accent line */}
          <motion.div
            className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="p-4 space-y-4">
            {/* Overall progress */}
            {phases.length > 0 && (
              <OverallProgress phases={phases} isVerifying={isVerifying} />
            )}

            {/* Stage groups */}
            <div className="space-y-3">
              {PHASE_GROUPS.map(group => (
                <StageGroup key={group.label} group={group} phases={phases} />
              ))}
            </div>

            {/* Live terminal */}
            <AnimatePresence>
              {showTerminal && activePhase && (
                <Terminal
                  key={activeStageId}
                  stageId={activeStageId!}
                  stageName={activePhase.name}
                  logs={terminalLogs}
                  isRunning={isTerminalRunning}
                />
              )}
            </AnimatePresence>

            {/* Verification checks */}
            {activeChecks.length > 0 && (
              <VerifyChecklist checks={checks} />
            )}

            {/* Health report */}
            {healthReport && (
              <HealthReportCard report={healthReport} />
            )}
          </div>
        </div>

        {/* Notifications overlay */}
        <div className="flex flex-col gap-1.5 pointer-events-none">
          <AnimatePresence>
            {notifications.slice(-3).map(note => (
              <NotificationToast
                key={note.id}
                note={note}
                onDone={() => dismissNotification(note.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
