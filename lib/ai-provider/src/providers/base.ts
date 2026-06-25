/**
 * BaseProvider — Abstract base class for all AI providers.
 *
 * Provides shared utilities:
 *   - OpenAI-compatible chat payload builder
 *   - Streaming SSE parser
 *   - Standard error normalisation
 */

import type {
  AIProvider,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ConnectionTestResult,
  ModelInfo,
  ProviderCapabilities,
  ProviderConfig,
  StreamChunk,
} from "../types.js";

export interface OpenAIChatPayload {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export abstract class BaseProvider implements AIProvider {
  abstract readonly slug: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: ProviderCapabilities;
  abstract readonly defaultModel?: string;
  abstract readonly defaultBaseUrl?: string;
  readonly freeTierNote?: string;

  abstract chat(
    request: ChatRequest,
    config: ProviderConfig
  ): Promise<ChatResponse>;

  abstract chatStream(
    request: ChatRequest,
    config: ProviderConfig
  ): AsyncGenerator<StreamChunk>;

  abstract listModels(config: ProviderConfig): Promise<ModelInfo[]>;

  abstract testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;

  protected buildMessages(request: ChatRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push(...request.messages);
    return messages;
  }

  protected resolveModel(request: ChatRequest, config: ProviderConfig): string {
    return (
      request.model ??
      config.defaultModel ??
      this.defaultModel ??
      "default"
    );
  }

  protected resolveBaseUrl(config: ProviderConfig): string {
    return (config.baseUrl ?? this.defaultBaseUrl ?? "").replace(/\/$/, "");
  }

  protected buildHeaders(
    apiKey: string | null | undefined,
    extra: Record<string, string> = {}
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extra,
    };
    if (apiKey) {
      // Strip any non-ASCII characters (> 127) from the API key before placing
      // it in the Authorization header. HTTP headers must be valid ByteStrings
      // (characters in range 0–255); characters like em dashes (U+2014, 8212)
      // cause Node.js fetch() to throw a ByteString TypeError. Valid API keys
      // are always pure ASCII — any character above 127 indicates corruption
      // (e.g. smart-dash substitution from copy-pasting).
      const sanitizedKey = apiKey.replace(/[^\x00-\x7F]/g, "");
      if (sanitizedKey !== apiKey) {
        console.warn(
          `[BaseProvider] buildHeaders: API key contained ${apiKey.length - sanitizedKey.length} non-ASCII character(s) — stripped before use. ` +
          `Check that the key was not copy-pasted from a source that substitutes smart punctuation.`
        );
      }
      headers["Authorization"] = `Bearer ${sanitizedKey}`;
    }
    return headers;
  }

  protected async *parseSSEStream(
    response: Response
  ): AsyncGenerator<StreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) return;

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
          if (!trimmed || trimmed === "data: [DONE]") {
            if (trimmed === "data: [DONE]") {
              yield { content: "", done: true };
            }
            continue;
          }
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.text ??
                "";
              if (content) {
                yield { content, done: false };
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected normalizeError(err: unknown, providerName: string): Error {
    if (err instanceof Error) return err;
    return new Error(`${providerName} error: ${String(err)}`);
  }
}
