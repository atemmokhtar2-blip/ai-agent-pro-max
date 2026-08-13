import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LLMMessage, LLMOptions } from "./provider-manager/types.js";

const DEFAULT_TIMEOUT_MS = 90_000;

async function findBridge(): Promise<string> {
  const candidates = [
    process.env["G4F_BRIDGE_PATH"],
    path.resolve(process.cwd(), "artifacts/api-server/src/lib/g4f-bridge.py"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "g4f-bridge.py"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next deployment layout.
    }
  }

  throw new Error(
    "g4f bridge script was not found. Set G4F_BRIDGE_PATH or keep artifacts/api-server/src/lib/g4f-bridge.py in the deployment.",
  );
}

export async function completeWithG4F(
  messages: LLMMessage[],
  options: LLMOptions = {},
): Promise<{ content: string; model: string }> {
  const bridge = await findBridge();
  const timeoutMs = Number(process.env["G4F_TIMEOUT_MS"] ?? DEFAULT_TIMEOUT_MS);
  const payload = JSON.stringify({
    messages,
    model: options.model ?? process.env["G4F_MODEL"] ?? "gpt-4o-mini",
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  });

  return await new Promise((resolve, reject) => {
    const child = spawn(process.env["PYTHON_BIN"] ?? "python3", [bridge], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new Error(`g4f timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) => {
      finish(() => {
        const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
        let result: { ok?: boolean; content?: string; model?: string; error?: string } = {};
        try { result = line ? JSON.parse(line) : {}; } catch { /* use stderr below */ }
        if (code !== 0 || result.ok === false || !result.content) {
          const detail = result.error || stderr.trim() || `process exited with code ${code}`;
          reject(new Error(`g4f fallback failed: ${detail.slice(0, 500)}`));
          return;
        }
        resolve({ content: result.content, model: result.model ?? "g4f" });
      });
    });

    child.stdin.end(`${payload}\n`);
  });
}
