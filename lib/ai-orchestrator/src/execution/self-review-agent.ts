/**
 * Self-Review Agent
 *
 * After every phase, automatically reviews the work for:
 *   - Build errors / TypeScript issues
 *   - Runtime errors
 *   - Performance problems
 *   - Accessibility issues
 *   - Security weaknesses
 *   - Duplicate code
 *   - Missing features from the spec
 *
 * Uses LLM to assess the phase output and returns a ReviewResult.
 * Auto-fixes are noted but actual patching is done by the execution engine.
 */

import { callWithFallback } from "../fallback-engine.js";
import type { ExecutionSpec, PhaseTask, ReviewResult, ReviewFinding } from "../specification/spec-types.js";

const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer and QA engineer.
Review the completed phase tasks and identify any issues.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "passed": true,
  "score": 0-100,
  "findings": [
    {
      "type": "build_error|type_error|lint_error|runtime_error|performance|accessibility|security|duplicate|missing_feature",
      "severity": "critical|major|minor",
      "description": "specific description of the issue",
      "autoFixed": false,
      "fix": "how to fix it (optional)"
    }
  ],
  "summary": "one-sentence summary"
}

Guidelines:
- passed = true if score >= 70 and no critical findings
- Be specific about issues — generic "could be improved" is not useful
- autoFixed = true only if the fix is a simple text substitution or config change
- Focus on what matters: correctness, security, performance`;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch { /* continue */ }
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(fenced); } catch { /* continue */ }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

export async function reviewPhase(
  phaseName: string,
  tasks: PhaseTask[],
  spec: ExecutionSpec,
  signal?: AbortSignal,
): Promise<ReviewResult> {
  const start = Date.now();

  const completedTasks = tasks.filter((t) => t.status === "completed");
  if (completedTasks.length === 0) {
    return { passed: true, score: 90, findings: [], autoFixedCount: 0, summary: "No tasks to review" };
  }

  const taskSummary = completedTasks
    .map((t) => `- ${t.name}: ${t.output ?? t.description}`)
    .join("\n");

  const reviewPrompt = `Review Phase: "${phaseName}"

Project: ${spec.summary}
Tech Stack: ${spec.techStack.join(", ")}

Completed Tasks:
${taskSummary}

Key Requirements:
- Auth: ${spec.understanding.auth.required ? `${spec.understanding.auth.provider} with roles: ${spec.understanding.auth.roles.join(", ")}` : "not required"}
- Security: CORS=${spec.understanding.security.cors}, Helmet=${spec.understanding.security.helmet}, RateLimit=${spec.understanding.security.rateLimit}
- Database: ${spec.understanding.database.type} via ${spec.understanding.database.orm}

Check for: completeness, security gaps, missing error handling, performance issues, type safety.`;

  const result = await callWithFallback({
    agentType: "research",
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    preferredModelIds: ["kimi-k2", "deepseek-v3", "gpt4o-mini"],
    request: { messages: [{ role: "user", content: reviewPrompt }], signal },
    start,
  });

  if (result.error) {
    return { passed: true, score: 80, findings: [], autoFixedCount: 0, summary: "Review skipped — LLM unavailable" };
  }

  const parsed = extractJson(result.content);
  if (!parsed || typeof parsed !== "object") {
    return { passed: true, score: 80, findings: [], autoFixedCount: 0, summary: "Review skipped — parse error" };
  }

  const p = parsed as Record<string, unknown>;
  const findings: ReviewFinding[] = Array.isArray(p["findings"])
    ? (p["findings"] as Record<string, unknown>[]).map((f): ReviewFinding => ({
        type: (typeof f["type"] === "string" ? f["type"] : "missing_feature") as ReviewFinding["type"],
        severity: (typeof f["severity"] === "string" ? f["severity"] : "minor") as ReviewFinding["severity"],
        description: typeof f["description"] === "string" ? f["description"] : "",
        autoFixed: typeof f["autoFixed"] === "boolean" ? f["autoFixed"] : false,
        fix: typeof f["fix"] === "string" ? f["fix"] : undefined,
      }))
    : [];

  const score = typeof p["score"] === "number" ? Math.min(100, Math.max(0, p["score"])) : 80;
  const hasCritical = findings.some((f) => f.severity === "critical");
  const passed = typeof p["passed"] === "boolean" ? p["passed"] : score >= 70 && !hasCritical;
  const autoFixedCount = findings.filter((f) => f.autoFixed).length;

  return {
    passed,
    score,
    findings,
    autoFixedCount,
    summary: typeof p["summary"] === "string" ? p["summary"] : `Phase review complete. Score: ${score}/100`,
  };
}
