/**
 * OpenRouter Provider
 *
 * Unified API gateway to 200+ models from many providers.
 * Multiple free models available (Llama, Mistral, Gemma, etc.).
 * Requires a free API key from openrouter.ai.
 *
 * Docs: https://openrouter.ai/docs
 */

import { BaseProvider } from "./base.js";
import type {
  ChatRequest,
  ChatResponse,
  ConnectionTestResult,
  ModelInfo,
  ProviderCapabilities,
  ProviderConfig,
  StreamChunk,
} from "../types.js";

const DEFAULT_FREE_MODELS: ModelInfo[] = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (Free)", isFree: true },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (Free)", isFree: true },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B IT (Free)", isFree: true },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat V3 (Free)", isFree: true },
  { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi-3 Mini 128K (Free)", isFree: true },
  { id: "qwen/qwen3-8b:free", name: "Qwen 3 8B (Free)", isFree: true },
];

// ── Header diagnostics ────────────────────────────────────────────────────────

function dumpFetchDiagnostics(
  callsite: string,
  headers: Record<string, string>,
  extras: Record<string, unknown> = {},
): void {
  console.log(`[OpenRouter][${callsite}] === PRE-FETCH DIAGNOSTICS ===`);

  // Dump every header key + value with per-character codes
  console.log(`[OpenRouter][${callsite}] Headers (${Object.keys(headers).length} total):`);
  for (const [key, value] of Object.entries(headers)) {
    const codes = Array.from(value).map((c) => c.charCodeAt(0));
    const nonAscii = codes.filter((c) => c > 127);
    const flagged = codes.filter((c) => c > 255);
    console.log(`  KEY   "${key}" (len=${key.length}) codes=[${Array.from(key).map((c) => c.charCodeAt(0)).join(",")}]`);
    console.log(`  VALUE "${value.slice(0, 100)}" (len=${value.length}) codes=[${codes.join(",")}]`);
    if (nonAscii.length > 0) {
      console.log(`  *** WARN: non-ASCII codepoints in VALUE: [${nonAscii.join(",")}]`);
    }
    if (flagged.length > 0) {
      console.log(`  *** ERROR: non-ByteString codepoints in VALUE: [${flagged.join(",")}]`);
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code > 255) {
          console.log(`    -> index=${i} char="${value[i]}" codepoint=${code} (U+${code.toString(16).toUpperCase().padStart(4, "0")})`);
        }
      }
    }
  }

  // Dump extra metadata fields
  if (Object.keys(extras).length > 0) {
    console.log(`[OpenRouter][${callsite}] Extra fields:`);
    for (const [k, v] of Object.entries(extras)) {
      const s = String(v);
      const codes = Array.from(s).map((c) => c.charCodeAt(0));
      const flagged = codes.filter((c) => c > 255);
      console.log(`  ${k}="${s.slice(0, 100)}" len=${s.length} codes=[${codes.join(",")}]${flagged.length > 0 ? " *** HAS NON-BYTESTRING" : ""}`);
    }
  }

  console.log(`[OpenRouter][${callsite}] === END DIAGNOSTICS ===`);
}

export class OpenRouterProvider extends BaseProvider {
  readonly slug = "openrouter";
  readonly name = "OpenRouter";
  readonly description = "Unified gateway to 200+ models. Many free models available with a free API key.";
  readonly defaultBaseUrl = "https://openrouter.ai/api/v1";
  readonly defaultModel = "meta-llama/llama-3.3-70b-instruct:free";
  readonly freeTierNote = "Free API key at openrouter.ai. Many top models available for free.";
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    functionCalling: true,
    freeModelsAvailable: true,
  };

  async chat(request: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const baseUrl = this.resolveBaseUrl(config);
    const model = this.resolveModel(request, config);
    const messages = this.buildMessages(request);

    const chatHeaders = this.buildHeaders(config.apiKey, {
      "HTTP-Referer": "https://ai-agent-platform.replit.app",
      "X-Title": "AI Agent Platform",
    });
    dumpFetchDiagnostics("chat", chatHeaders, {
      baseUrl,
      model,
      "config.apiKey_length": config.apiKey?.length ?? 0,
      "config.defaultModel": config.defaultModel ?? "(none)",
      "config.baseUrl": config.baseUrl ?? "(none)",
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json() as {
      choices: { message: { content: string }; finish_reason: string }[];
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? model,
      finishReason: data.choices[0]?.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async *chatStream(request: ChatRequest, config: ProviderConfig): AsyncGenerator<StreamChunk> {
    const baseUrl = this.resolveBaseUrl(config);
    const model = this.resolveModel(request, config);
    const messages = this.buildMessages(request);

    const streamHeaders = this.buildHeaders(config.apiKey, {
      "HTTP-Referer": "https://ai-agent-platform.replit.app",
      "X-Title": "AI Agent Platform",
    });
    dumpFetchDiagnostics("chatStream", streamHeaders, {
      baseUrl,
      model,
      "config.apiKey_length": config.apiKey?.length ?? 0,
      "config.defaultModel": config.defaultModel ?? "(none)",
      "config.baseUrl": config.baseUrl ?? "(none)",
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: streamHeaders,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter stream error ${response.status}: ${err}`);
    }

    yield* this.parseSSEStream(response);
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const baseUrl = this.resolveBaseUrl(config);
      const res = await fetch(`${baseUrl}/models`, {
        headers: this.buildHeaders(config.apiKey),
      });
      if (!res.ok) return DEFAULT_FREE_MODELS;
      const data = await res.json() as { data: { id: string; name: string; context_length?: number; pricing?: { prompt: string } }[] };
      return data.data.map((m) => ({
        id: m.id,
        name: m.name,
        contextLength: m.context_length,
        isFree: m.pricing?.prompt === "0",
      }));
    } catch {
      return DEFAULT_FREE_MODELS;
    }
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const baseUrl = this.resolveBaseUrl(config);
      const res = await fetch(`${baseUrl}/models`, {
        headers: this.buildHeaders(config.apiKey),
      });
      return {
        ok: res.ok,
        message: res.ok ? "Connection successful" : `HTTP ${res.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return { ok: false, message: String(err), latencyMs: Date.now() - start };
    }
  }
}

export const openrouterProvider = new OpenRouterProvider();
