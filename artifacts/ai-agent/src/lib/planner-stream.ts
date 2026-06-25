/**
 * Planner Streaming Client
 *
 * Reads the SSE stream from POST /api/v1/ai/planner/stream using fetch +
 * ReadableStream (EventSource does not support custom headers, so we roll our own).
 */

export type PlannerStreamEvent =
  | { type: "stage_start"; stage: number; name: string }
  | { type: "stage_complete"; stage: number }
  | { type: "content_chunk"; text: string }
  | { type: "section_detected"; section: number; title: string }
  | { type: "done"; content: string; model: string; conversationId: string; messageId: string }
  | { type: "conversation"; content: string; conversationId: string; messageId: string }
  | { type: "error"; message: string };

export const PLANNER_STAGES = [
  { id: 1, name: "Analyze Request" },
  { id: 2, name: "Classify Project" },
  { id: 3, name: "Design Architecture" },
  { id: 4, name: "Design Database" },
  { id: 5, name: "Generate APIs" },
  { id: 6, name: "Security Review" },
  { id: 7, name: "Deployment Strategy" },
  { id: 8, name: "Blueprint Finalization" },
] as const;

export async function streamToPlannerEngine(
  message: string,
  conversationId: string,
  onEvent: (event: PlannerStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem("access_token");

  const response = await fetch("/api/v1/ai/planner/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Planner request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMsg = body.error;
    } catch {
      // ignore parse error
    }
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
          const event = JSON.parse(data) as PlannerStreamEvent;
          onEvent(event);
        } catch {
          // malformed event — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
