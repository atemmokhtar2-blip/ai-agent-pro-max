/**
 * Execution Pipeline Streaming Client
 *
 * Reads the SSE stream from POST /api/v1/ai/execute/stream using fetch +
 * ReadableStream. Mirrors the structure of planner-stream.ts.
 */

export type ExecVerifyStatus = "pass" | "fail" | "skip" | "checking" | "fixing" | "fixed" | "unfixable";

export interface VerificationCheckResult {
  id: string;
  name: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  duration: number;
}

export type ExecutionStreamEvent =
  | { type: "exec_stage_start";    stage: number; stageName: string; stageLabel: string }
  | { type: "exec_stage_complete"; stage: number; duration: number }
  | { type: "exec_stage_fail";     stage: number; error: string; duration?: number }
  | { type: "verify_check";        check: string; checkName: string; status: ExecVerifyStatus; detail?: string }
  | { type: "fix_attempt";         check: string; checkName?: string; strategy: string }
  | { type: "fix_result";          check: string; status: "fixed" | "unfixable"; strategy: string }
  | { type: "exec_done";           checks: VerificationCheckResult[]; allPassed: boolean }
  | { type: "exec_error";          message: string };

export const EXEC_STAGE_LABELS: Record<number, { name: string; label: string }> = {
  1: { name: "Analyzing Blueprint",     label: "Scanning"   },
  2: { name: "Installing Dependencies", label: "Installing" },
  3: { name: "Building Project",        label: "Building"   },
  4: { name: "Running Linter",          label: "Linting"    },
  5: { name: "Type Checking",           label: "Checking"   },
  6: { name: "Running Tests",           label: "Testing"    },
  7: { name: "Starting Application",    label: "Launching"  },
  8: { name: "Verifying Project",       label: "Verifying"  },
};

export const VERIFY_CHECK_NAMES: Record<string, string> = {
  build:    "Build",
  typecheck:"Typecheck",
  runtime:  "Runtime",
  api:      "API",
  database: "Database",
  frontend: "Frontend",
  tests:    "Tests",
  preview:  "Preview Running",
};

export async function streamToExecutionEngine(
  conversationId: string,
  blueprint: string,
  onEvent: (event: ExecutionStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem("access_token");

  const response = await fetch("/api/v1/ai/execute/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conversation_id: conversationId, blueprint }),
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Execution request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const event = JSON.parse(data) as ExecutionStreamEvent;
          onEvent(event);
        } catch { /* malformed — skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
