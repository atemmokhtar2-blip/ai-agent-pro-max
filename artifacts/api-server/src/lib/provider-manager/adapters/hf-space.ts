/**
 * HuggingFace Space (Gradio) adapter
 *
 * Calls the user's public Gradio space at HF_SPACE_URL (or the hardcoded
 * default URL). No API key required — the space is public.
 *
 * Gradio API flow:
 *   POST /gradio_api/call/respond  → { event_id }
 *   GET  /gradio_api/call/respond/{event_id}  → SSE stream
 *     event: generating  data: "partial token"
 *     event: complete    data: ["final full text"]
 *     event: error       data: null
 */

import type { ProviderAdapter, LLMMessage, LLMOptions, ProviderError } from "../types.js";

const DEFAULT_SPACE_URL = "https://7atemmmmm-replit-agent.hf.space";
const TIMEOUT_MS        = 120_000; // Gradio can be slow on cold start
const MAX_TOKENS_CAP    = 1900;    // Space slider max is 2048; leave headroom

function resolveSpaceUrl(apiKey: string): string {
  const k = apiKey.trim();
  if (!k || k === "default" || k === "hf-space-default") return DEFAULT_SPACE_URL;
  // If the key looks like a URL, use it directly (allows custom spaces)
  if (k.startsWith("https://") || k.startsWith("http://")) return k.replace(/\/$/, "");
  return DEFAULT_SPACE_URL;
}

/**
 * Convert LLMMessage[] → Gradio /respond format.
 * Extracts system message, builds conversation context.
 */
function messagesToGradio(messages: LLMMessage[]): {
  message: string;
  system_message: string;
} {
  const systemMsgs = messages.filter(m => m.role === "system");
  const turns      = messages.filter(m => m.role !== "system");

  const system_message = systemMsgs.map(m => m.content).join("\n\n").slice(0, 3000);

  // Build context from all turns except the last user message
  const history = turns.slice(0, -1);
  const lastMsg = turns[turns.length - 1];
  const userContent = lastMsg?.content ?? "";

  let message: string;
  if (history.length === 0) {
    message = userContent;
  } else {
    // Prefix with conversation history (condensed to save tokens)
    const ctx = history
      .slice(-4) // last 4 turns max
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 400)}`)
      .join("\n");
    message = `${ctx}\n\nUser: ${userContent}`;
  }

  return { message: message.slice(0, 4000), system_message };
}

async function callGradio(
  spaceUrl: string,
  message: string,
  system_message: string,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<string> {
  // Step 1: POST to start the prediction
  const postResp = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [message, system_message, Math.min(maxTokens, MAX_TOKENS_CAP), temperature, 0.95],
    }),
    signal: AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : signal,
  });

  if (!postResp.ok) {
    const body = await postResp.text().catch(() => "");
    throw new Error(`Gradio POST failed HTTP ${postResp.status}: ${body.slice(0, 120)}`);
  }

  const { event_id } = await postResp.json() as { event_id: string };
  if (!event_id) throw new Error("Gradio did not return event_id");

  // Step 2: GET SSE stream for the result
  const getResp = await fetch(`${spaceUrl}/gradio_api/call/respond/${event_id}`, {
    signal: AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : signal,
  });

  if (!getResp.ok) {
    throw new Error(`Gradio GET failed HTTP ${getResp.status}`);
  }

  const reader  = getResp.body?.getReader();
  if (!reader) throw new Error("No body from Gradio SSE");

  const decoder = new TextDecoder();
  let buffer    = "";
  let lastEvent = "";
  let result    = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event:")) {
          lastEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          const raw = trimmed.slice(5).trim();
          if (lastEvent === "error") {
            throw new Error(`Gradio error event: ${raw}`);
          }
          if (lastEvent === "complete") {
            // data is a JSON array: ["final text"]
            try {
              const parsed = JSON.parse(raw) as string | string[];
              result = Array.isArray(parsed) ? (parsed[0] ?? "") : String(parsed);
            } catch {
              result = raw.replace(/^"|"$/g, ""); // strip surrounding quotes
            }
            return result; // done
          }
          if (lastEvent === "generating") {
            // partial chunk — store in case "complete" never fires
            try {
              const parsed = JSON.parse(raw) as string;
              result = typeof parsed === "string" ? parsed : raw;
            } catch {
              result = raw.replace(/^"|"$/g, "");
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // If we exited the loop without a "complete" event, use last generating result
  if (!result) throw new Error("Gradio stream ended without a complete event");
  return result;
}

export const hfSpaceAdapter: ProviderAdapter = {
  slug:        "hf-space",
  displayName: "HF Space (Free)",
  baseUrl:     DEFAULT_SPACE_URL,
  envPrefix:   "HF_SPACE_URL",
  defaultModels: {
    planning:      "hf-space-qwen",
    "code-gen":    "hf-space-qwen",
    debugging:     "hf-space-qwen",
    documentation: "hf-space-qwen",
    review:        "hf-space-qwen",
    verification:  "hf-space-qwen",
    general:       "hf-space-qwen",
  },

  async complete(messages: LLMMessage[], options: LLMOptions, apiKey: string) {
    const spaceUrl    = resolveSpaceUrl(apiKey);
    const maxTokens   = Math.min(options.maxTokens ?? 1900, MAX_TOKENS_CAP);
    const temperature = options.temperature ?? 0.2;

    const signal = options.signal ?? AbortSignal.timeout(TIMEOUT_MS);

    const { message, system_message } = messagesToGradio(messages);

    try {
      const content = await callGradio(spaceUrl, message, system_message, maxTokens, temperature, signal);
      if (!content) {
        const pe: ProviderError = { kind: "incomplete_response", message: "Empty HF Space response", retryable: true, waitMs: 0, suggestNextProvider: false };
        throw Object.assign(new Error("Empty HF Space response"), { providerError: pe });
      }
      return { content };
    } catch (err) {
      const msg   = (err as Error).message ?? String(err);
      const pe    = this.classifyError(err);
      throw Object.assign(new Error(msg), { providerError: pe });
    }
  },

  async testConnection(apiKey: string) {
    const spaceUrl = resolveSpaceUrl(apiKey);
    const t0 = Date.now();
    try {
      const resp = await fetch(`${spaceUrl}/gradio_api/info`, {
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: resp.ok, latencyMs: Date.now() - t0, error: resp.ok ? undefined : `HTTP ${resp.status}` };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
    }
  },

  classifyError(err: unknown, statusCode?: number): ProviderError {
    const msg   = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (statusCode === 429) return { kind: "rate_limited",   message: "Rate limited",       statusCode: 429, retryable: true,  waitMs: 10_000, suggestNextProvider: false };
    if (statusCode === 503) return { kind: "server_error",   message: "Model loading/busy", statusCode: 503, retryable: true,  waitMs: 30_000, suggestNextProvider: false };
    if (statusCode && statusCode >= 500) return { kind: "server_error", message: `Server error ${statusCode}`, statusCode, retryable: true, waitMs: 5_000, suggestNextProvider: false };
    if (lower.includes("abort") || lower.includes("timeout")) return { kind: "timeout",       message: msg, retryable: true, waitMs: 0,     suggestNextProvider: true };
    if (lower.includes("gradio error"))                        return { kind: "server_error", message: msg, retryable: true, waitMs: 5_000, suggestNextProvider: false };
    if (lower.includes("event_id"))                           return { kind: "server_error", message: msg, retryable: true, waitMs: 3_000, suggestNextProvider: false };
    if (lower.includes("fetch") || lower.includes("network")) return { kind: "network_error", message: msg, retryable: true, waitMs: 2_000, suggestNextProvider: true };
    return { kind: "unknown", message: msg, retryable: true, waitMs: 2_000, suggestNextProvider: false };
  },
};
