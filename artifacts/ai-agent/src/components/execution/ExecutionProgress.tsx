/**
 * ExecutionProgress
 * Animated progress bar for task execution.
 * Supports all lifecycle statuses including executing, verifying, fixing, verified.
 */

import type { TaskStatus } from "@/lib/task-store";

interface ExecutionProgressProps {
  value: number;
  status: TaskStatus;
  showLabel?: boolean;
}

const TRACK_COLORS: Record<TaskStatus, string> = {
  planning:  "from-blue-500 to-blue-400",
  working:   "from-primary to-primary/70",
  building:  "from-amber-500 to-amber-400",
  executing: "from-violet-500 to-violet-400",
  verifying: "from-cyan-500 to-cyan-400",
  fixing:    "from-orange-500 to-orange-400",
  verified:  "from-green-500 to-green-400",
  ready:     "from-green-500 to-green-400",
  error:     "from-red-500 to-red-400",
  cancelled: "from-muted-foreground/40 to-muted-foreground/20",
};

const ACTIVE_STATUSES = new Set<TaskStatus>([
  "planning", "working", "building", "executing", "verifying", "fixing",
]);

export function ExecutionProgress({ value, status, showLabel = false }: ExecutionProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradient = TRACK_COLORS[status] ?? TRACK_COLORS.planning;
  const isActive = ACTIVE_STATUSES.has(status);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
        {isActive && (
          <div
            className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ left: `calc(${clamped}% - 2rem)` }}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground/60 w-8 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
