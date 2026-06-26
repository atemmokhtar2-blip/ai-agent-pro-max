/**
 * ExecutionStatusBadge
 * A small pill that shows the current task status with color coding.
 * Handles all lifecycle statuses including executing, verifying, fixing, verified.
 */

import type { TaskStatus } from "@/lib/task-store";

const CONFIG: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  planning: {
    label: "Planning",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400 animate-pulse",
  },
  working: {
    label: "Working",
    color: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary animate-pulse",
  },
  building: {
    label: "Building",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400 animate-pulse",
  },
  executing: {
    label: "Executing",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    dot: "bg-violet-400 animate-pulse",
  },
  verifying: {
    label: "Verifying",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    dot: "bg-cyan-400 animate-pulse",
  },
  fixing: {
    label: "Auto-fixing",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dot: "bg-orange-400 animate-pulse",
  },
  verified: {
    label: "Verified",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    dot: "bg-green-400",
  },
  ready: {
    label: "Ready",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    dot: "bg-green-400",
  },
  error: {
    label: "Error",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted/50 text-muted-foreground border-border",
    dot: "bg-muted-foreground/40",
  },
};

interface ExecutionStatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
}

export function ExecutionStatusBadge({ status, size = "sm" }: ExecutionStatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.planning;
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium ${textSize} ${cfg.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
