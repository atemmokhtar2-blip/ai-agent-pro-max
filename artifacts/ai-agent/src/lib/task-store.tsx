/**
 * TaskExecutionStore
 *
 * Global context that tracks all background execution tasks.
 * Tasks are persisted in localStorage so history survives page refresh.
 * The chat never touches this — only the floating TaskExecutionPanel reads it.
 *
 * Execution lifecycle:
 *   planning → working → building → executing → verifying → verified (or error)
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { StageState } from "@/components/design-system/AgentTimeline";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "planning"
  | "working"
  | "building"
  | "executing"
  | "verifying"
  | "fixing"
  | "verified"
  | "ready"
  | "error"
  | "cancelled";

export type ExecPhaseStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export interface ExecPhase {
  id: number;
  name: string;
  label: string;
  status: ExecPhaseStatus;
  duration?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export type VerifyStatus = "pending" | "checking" | "pass" | "fail" | "skip" | "fixing" | "fixed";

export interface VerificationCheck {
  id: string;
  name: string;
  status: VerifyStatus;
  detail?: string;
  duration?: number;
}

export interface ExecutionResult {
  phases: ExecPhase[];
  checks: VerificationCheck[];
  allPassed: boolean;
  completedAt: string;
}

export interface ExecutionTask {
  id: string;
  conversationId: string;
  title: string;
  userPrompt: string;
  status: TaskStatus;
  progress: number;
  stages: StageState[];
  startedAt: string;
  completedAt?: string;
  result?: { content: string; model: string };
  error?: string;
  dismissed?: boolean;
  execPhases?: ExecPhase[];
  verificationChecks?: VerificationCheck[];
  executionResult?: ExecutionResult;
  previewUrl?: string;
}

type TaskAction =
  | { type: "CREATE_TASK"; task: ExecutionTask }
  | { type: "STAGE_START"; taskId: string; stageId: number; startedAt: string }
  | { type: "STAGE_COMPLETE"; taskId: string; stageId: number; completedAt: string }
  | { type: "COMPLETE_TASK"; taskId: string; content: string; model: string; completedAt: string }
  | { type: "FAIL_TASK"; taskId: string; error: string }
  | { type: "CANCEL_TASK"; taskId: string }
  | { type: "DISMISS_TASK"; taskId: string }
  | { type: "LOAD_TASKS"; tasks: ExecutionTask[] }
  | { type: "START_EXECUTION"; taskId: string; phases: ExecPhase[] }
  | { type: "EXEC_PHASE_START"; taskId: string; phaseId: number; startedAt: string }
  | { type: "EXEC_PHASE_COMPLETE"; taskId: string; phaseId: number; duration: number; completedAt: string }
  | { type: "EXEC_PHASE_FAIL"; taskId: string; phaseId: number; error: string }
  | { type: "SET_VERIFY_CHECK"; taskId: string; check: VerificationCheck }
  | { type: "SET_VERIFY_FIXING"; taskId: string; checkId: string; strategy: string }
  | { type: "SET_VERIFIED"; taskId: string; result: ExecutionResult }
  | { type: "SET_EXEC_ERROR"; taskId: string; error: string };

interface TaskStore {
  tasks: ExecutionTask[];
  dispatch: React.Dispatch<TaskAction>;
}

// ── Default execution phases ───────────────────────────────────────────────────

export const DEFAULT_EXEC_PHASES: ExecPhase[] = [
  { id: 1, name: "Analyzing Blueprint",     label: "Scanning",    status: "pending" },
  { id: 2, name: "Installing Dependencies", label: "Installing",  status: "pending" },
  { id: 3, name: "Building Project",        label: "Building",    status: "pending" },
  { id: 4, name: "Running Linter",          label: "Linting",     status: "pending" },
  { id: 5, name: "Type Checking",           label: "Checking",    status: "pending" },
  { id: 6, name: "Running Tests",           label: "Testing",     status: "pending" },
  { id: 7, name: "Starting Application",    label: "Launching",   status: "pending" },
  { id: 8, name: "Verifying Project",       label: "Verifying",   status: "pending" },
];

export const DEFAULT_VERIFY_CHECKS: VerificationCheck[] = [
  { id: "build",     name: "Build",           status: "pending" },
  { id: "typecheck", name: "Typecheck",        status: "pending" },
  { id: "runtime",   name: "Runtime",          status: "pending" },
  { id: "api",       name: "API",              status: "pending" },
  { id: "database",  name: "Database",         status: "pending" },
  { id: "frontend",  name: "Frontend",         status: "pending" },
  { id: "tests",     name: "Tests",            status: "pending" },
  { id: "preview",   name: "Preview Running",  status: "pending" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function stageProgress(stages: StageState[]): number {
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => s.status === "complete").length;
  const running = stages.some((s) => s.status === "running") ? 0.5 : 0;
  return Math.round(((done + running) / stages.length) * 100);
}

function statusFromStages(stages: StageState[]): TaskStatus {
  const runningIdx = stages.findIndex((s) => s.status === "running");
  if (runningIdx === -1) {
    const allDone = stages.every((s) => s.status === "complete");
    return allDone ? "ready" : "planning";
  }
  if (runningIdx <= 2) return "planning";
  if (runningIdx <= 5) return "working";
  return "building";
}

function execProgress(phases: ExecPhase[]): number {
  if (phases.length === 0) return 0;
  const done = phases.filter((p) => p.status === "complete").length;
  const running = phases.some((p) => p.status === "running") ? 0.5 : 0;
  return Math.round(((done + running) / phases.length) * 100);
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: ExecutionTask[], action: TaskAction): ExecutionTask[] {
  switch (action.type) {
    case "LOAD_TASKS":
      return action.tasks;

    case "CREATE_TASK":
      return [action.task, ...state];

    case "STAGE_START": {
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const stages = t.stages.map((s) =>
          s.id === action.stageId
            ? { ...s, status: "running" as const, startedAt: action.startedAt }
            : s
        );
        return {
          ...t,
          stages,
          status: statusFromStages(stages),
          progress: stageProgress(stages),
        };
      });
    }

    case "STAGE_COMPLETE": {
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const stages = t.stages.map((s) =>
          s.id === action.stageId
            ? { ...s, status: "complete" as const, completedAt: action.completedAt }
            : s
        );
        return {
          ...t,
          stages,
          status: statusFromStages(stages),
          progress: stageProgress(stages),
        };
      });
    }

    case "COMPLETE_TASK":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const stages = t.stages.map((s) => ({
          ...s,
          status: "complete" as const,
          completedAt: s.completedAt ?? action.completedAt,
        }));
        return {
          ...t,
          stages,
          status: "ready" as const,
          progress: 100,
          completedAt: action.completedAt,
          result: { content: action.content, model: action.model },
        };
      });

    case "FAIL_TASK":
      return state.map((t) =>
        t.id === action.taskId
          ? { ...t, status: "error" as const, error: action.error, completedAt: new Date().toISOString() }
          : t
      );

    case "CANCEL_TASK":
      return state.map((t) =>
        t.id === action.taskId
          ? { ...t, status: "cancelled" as const, completedAt: new Date().toISOString() }
          : t
      );

    case "DISMISS_TASK":
      return state.map((t) =>
        t.id === action.taskId ? { ...t, dismissed: true } : t
      );

    case "START_EXECUTION":
      return state.map((t) =>
        t.id === action.taskId
          ? {
              ...t,
              status: "executing" as const,
              progress: 0,
              execPhases: action.phases,
              verificationChecks: DEFAULT_VERIFY_CHECKS.map((c) => ({ ...c })),
            }
          : t
      );

    case "EXEC_PHASE_START":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const execPhases = (t.execPhases ?? []).map((p) =>
          p.id === action.phaseId
            ? { ...p, status: "running" as const, startedAt: action.startedAt }
            : p
        );
        return {
          ...t,
          execPhases,
          status: action.phaseId >= 8 ? "verifying" as const : "executing" as const,
          progress: execProgress(execPhases),
        };
      });

    case "EXEC_PHASE_COMPLETE":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const execPhases = (t.execPhases ?? []).map((p) =>
          p.id === action.phaseId
            ? { ...p, status: "complete" as const, duration: action.duration, completedAt: action.completedAt }
            : p
        );
        return {
          ...t,
          execPhases,
          progress: execProgress(execPhases),
        };
      });

    case "EXEC_PHASE_FAIL":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const execPhases = (t.execPhases ?? []).map((p) =>
          p.id === action.phaseId
            ? { ...p, status: "failed" as const, error: action.error }
            : p
        );
        return { ...t, execPhases, status: "error" as const };
      });

    case "SET_VERIFY_CHECK":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const verificationChecks = (t.verificationChecks ?? DEFAULT_VERIFY_CHECKS.map((c) => ({ ...c }))).map((c) =>
          c.id === action.check.id ? { ...action.check } : c
        );
        const isFixing = verificationChecks.some((c) => c.status === "fixing");
        return {
          ...t,
          verificationChecks,
          status: isFixing ? "fixing" as const : "verifying" as const,
        };
      });

    case "SET_VERIFY_FIXING":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        const verificationChecks = (t.verificationChecks ?? []).map((c) =>
          c.id === action.checkId ? { ...c, status: "fixing" as const, detail: action.strategy } : c
        );
        return { ...t, verificationChecks, status: "fixing" as const };
      });

    case "SET_VERIFIED":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;
        return {
          ...t,
          status: action.result.allPassed ? "verified" as const : "error" as const,
          progress: 100,
          completedAt: action.result.completedAt,
          executionResult: action.result,
          verificationChecks: action.result.checks,
        };
      });

    case "SET_EXEC_ERROR":
      return state.map((t) =>
        t.id === action.taskId
          ? { ...t, status: "error" as const, error: action.error, completedAt: new Date().toISOString() }
          : t
      );

    default:
      return state;
  }
}

// ── Persistence ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "aiagent_tasks_v2";
const MAX_STORED = 50;

function saveTasks(tasks: ExecutionTask[]) {
  try {
    const toStore = tasks
      .filter((t) =>
        t.status === "ready" || t.status === "verified" ||
        t.status === "error" || t.status === "cancelled"
      )
      .slice(0, MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch { /* ignore */ }
}

function loadTasks(): ExecutionTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExecutionTask[];
  } catch {
    return [];
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const TaskContext = createContext<TaskStore | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    const stored = loadTasks();
    if (stored.length > 0) {
      dispatch({ type: "LOAD_TASKS", tasks: stored });
    }
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  return (
    <TaskContext.Provider value={{ tasks, dispatch }}>
      {children}
    </TaskContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useTaskStore() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskStore must be inside TaskProvider");
  return ctx;
}

export function useTaskActions() {
  const { dispatch } = useTaskStore();

  const createTask = useCallback(
    (task: Omit<ExecutionTask, "status" | "progress" | "dismissed">) => {
      dispatch({ type: "CREATE_TASK", task: { ...task, status: "planning", progress: 0, dismissed: false } });
    },
    [dispatch]
  );

  const stageStart = useCallback(
    (taskId: string, stageId: number) => {
      dispatch({ type: "STAGE_START", taskId, stageId, startedAt: new Date().toISOString() });
    },
    [dispatch]
  );

  const stageComplete = useCallback(
    (taskId: string, stageId: number) => {
      dispatch({ type: "STAGE_COMPLETE", taskId, stageId, completedAt: new Date().toISOString() });
    },
    [dispatch]
  );

  const completeTask = useCallback(
    (taskId: string, content: string, model: string) => {
      dispatch({ type: "COMPLETE_TASK", taskId, content, model, completedAt: new Date().toISOString() });
    },
    [dispatch]
  );

  const failTask = useCallback(
    (taskId: string, error: string) => { dispatch({ type: "FAIL_TASK", taskId, error }); },
    [dispatch]
  );

  const cancelTask = useCallback(
    (taskId: string) => { dispatch({ type: "CANCEL_TASK", taskId }); },
    [dispatch]
  );

  const dismissTask = useCallback(
    (taskId: string) => { dispatch({ type: "DISMISS_TASK", taskId }); },
    [dispatch]
  );

  const startExecution = useCallback(
    (taskId: string, phases: ExecPhase[]) => {
      dispatch({ type: "START_EXECUTION", taskId, phases });
    },
    [dispatch]
  );

  const execPhaseStart = useCallback(
    (taskId: string, phaseId: number) => {
      dispatch({ type: "EXEC_PHASE_START", taskId, phaseId, startedAt: new Date().toISOString() });
    },
    [dispatch]
  );

  const execPhaseComplete = useCallback(
    (taskId: string, phaseId: number, duration: number) => {
      dispatch({ type: "EXEC_PHASE_COMPLETE", taskId, phaseId, duration, completedAt: new Date().toISOString() });
    },
    [dispatch]
  );

  const execPhaseFail = useCallback(
    (taskId: string, phaseId: number, error: string) => {
      dispatch({ type: "EXEC_PHASE_FAIL", taskId, phaseId, error });
    },
    [dispatch]
  );

  const setVerifyCheck = useCallback(
    (taskId: string, check: VerificationCheck) => {
      dispatch({ type: "SET_VERIFY_CHECK", taskId, check });
    },
    [dispatch]
  );

  const setVerifyFixing = useCallback(
    (taskId: string, checkId: string, strategy: string) => {
      dispatch({ type: "SET_VERIFY_FIXING", taskId, checkId, strategy });
    },
    [dispatch]
  );

  const setVerified = useCallback(
    (taskId: string, result: ExecutionResult) => {
      dispatch({ type: "SET_VERIFIED", taskId, result });
    },
    [dispatch]
  );

  const setExecError = useCallback(
    (taskId: string, error: string) => {
      dispatch({ type: "SET_EXEC_ERROR", taskId, error });
    },
    [dispatch]
  );

  return {
    createTask, stageStart, stageComplete, completeTask, failTask, cancelTask, dismissTask,
    startExecution, execPhaseStart, execPhaseComplete, execPhaseFail,
    setVerifyCheck, setVerifyFixing, setVerified, setExecError,
  };
}
