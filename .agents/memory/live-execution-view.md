---
name: Live Execution View Architecture
description: How the professional live execution view is wired into LiveWorkspace, key constraints, and port fix.
---

# Live Execution View Architecture

## The rule
`LiveExecutionView` (in `artifacts/ai-agent/src/components/workspace/LiveExecutionView.tsx`) replaces `TypingBubble` in `LiveWorkspace.tsx` when `phase.kind === "executing" | "verifying"`. It receives data from two sources: the task store (phases, verificationChecks, healthReport) and local workspace state (execStageLogs, activeStageId).

**Why:** The task store holds durable per-task data that survives re-renders; terminal logs are ephemeral streaming data that resets on each new send and must be tracked separately to avoid polluting persisted task state.

## Key implementation points
- `execStageLogs: Map<number, string[]>` is local `useState` in `LiveWorkspace`, NOT in task-store. Reset on `handleStop` and at the start of `runExecution`.
- `activeStageId: number | null` tracks the currently running stage — set on `exec_stage_start`, used to display the correct terminal panel.
- Terminal output comes from `exec_stage_start.detail` field — the backend emits this for shell-spawning stages (3-9, 15-16). The frontend type was updated to add `detail?: string`.
- Verification check `detail` errors come from `verify_check.detail` field passed through `setVerifyCheck`.

## Stage grouping
- Planning: stages 1-2
- Build: stages 3-9
- Verification: stages 10-17

## Notification toasts
Milestone toasts fire at stage completions 2, 3, 4, 7, 9 and key verify passes (build_success, db_connection, runtime_errors). Uses `useRef<Set>` guards to prevent duplicate toasts on re-render.

## Port fix (critical)
`vite.config.ts` must hardcode `const port = 5000` — Replit injects a dynamic PORT env var that conflicts with the `.replit` `localPort=5000 → externalPort=80` mapping. Reading `process.env.PORT` causes vite to start on the wrong port (e.g. 23886), making the external webview URL unreachable.

**How to apply:** Any time vite.config.ts is modified, ensure it has `const port = 5000` (not `Number(process.env.PORT || "5000")`).
