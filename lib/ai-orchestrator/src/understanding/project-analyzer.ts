/**
 * Project Analyzer
 *
 * LLM-powered engine that analyzes a user's natural language request
 * and extracts a complete, structured ProjectUnderstanding.
 *
 * Infers missing requirements with high confidence — does not ask
 * unnecessary questions when context makes the answer obvious.
 *
 * Uses callWithFallback so all model health + fallback logic applies.
 */

import { callWithFallback } from "../fallback-engine.js";
import type { ProjectUnderstanding } from "./types.js";

// ─── JSON extraction helpers ───────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip ```json ... ``` fences
    const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    try {
      return JSON.parse(fenced);
    } catch {
      // Find first { ... } block
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          // fall through
        }
      }
    }
  }
  return null;
}

function safeBool(v: unknown, def = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "yes";
  return def;
}

function safeStr(v: unknown, def = ""): string {
  return typeof v === "string" ? v : def;
}

function safeArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const ANALYZER_SYSTEM_PROMPT = `You are a senior software architect specializing in web applications, APIs, and bots.

Given a user's project description, extract a complete structured analysis as JSON.
Infer missing requirements intelligently based on project type and domain context.
Do NOT ask questions — infer with high confidence.

Return ONLY a valid JSON object with this exact shape (no markdown fences, no explanation):

{
  "projectType": "website|web-app|api|bot|fullstack|e-commerce|dashboard|blog|portfolio|saas|mobile-app|cli|library",
  "businessDomain": "e.g. health-tech, fintech, education, social, productivity, etc.",
  "targetUsers": "description of end users",
  "complexity": "simple|moderate|complex|enterprise",
  "confidence": 0.0-1.0,
  "frontend": {
    "required": true,
    "framework": "React|Next.js|Vue|Svelte|Vanilla|None",
    "styling": "Tailwind|CSS Modules|MUI|Bootstrap|None",
    "pages": ["list of page names"],
    "hasAuth": true,
    "hasDashboard": false,
    "hasStaticPages": false,
    "routing": "client-side|server-side|hybrid",
    "stateManagement": "Context API|Redux|Zustand|None"
  },
  "backend": {
    "required": true,
    "framework": "Express|Fastify|NestJS|Django|FastAPI|None",
    "language": "TypeScript|JavaScript|Python|Go|None",
    "hasRestApi": true,
    "hasWebSockets": false,
    "hasGraphQL": false,
    "hasQueues": false,
    "hasWorkers": false,
    "serverless": false
  },
  "database": {
    "required": true,
    "type": "PostgreSQL|MySQL|MongoDB|SQLite|Redis|None",
    "orm": "Drizzle|Prisma|Mongoose|TypeORM|None",
    "tables": ["list of main entity names"],
    "requiresMigrations": true,
    "requiresSeeding": false,
    "caching": false
  },
  "auth": {
    "required": true,
    "provider": "JWT|OAuth|Session|Passkeys|None",
    "roles": ["user", "admin"],
    "hasEmailVerification": false,
    "hasMfa": false,
    "hasSocialLogin": false,
    "sessionManagement": "stateless|stateful"
  },
  "apis": {
    "externalApis": ["Stripe", "SendGrid"],
    "webhooks": false,
    "rateLimit": true,
    "versioning": false,
    "documentation": true
  },
  "integrations": ["list of third-party integrations"],
  "deployment": {
    "platform": "Replit|Vercel|AWS|GCP|Heroku|Railway|Fly.io",
    "containerized": false,
    "hasCI": false,
    "environments": ["development", "production"],
    "region": "us-east",
    "cdn": false,
    "monitoring": false
  },
  "security": {
    "cors": true,
    "helmet": true,
    "csrfProtection": false,
    "encryption": false,
    "inputSanitization": true,
    "xssProtection": true,
    "sqlInjectionProtection": true,
    "rateLimit": true
  },
  "performance": {
    "caching": false,
    "cdn": false,
    "lazyLoading": false,
    "codeSplitting": false,
    "imageOptimization": false,
    "ssr": false
  },
  "scalability": {
    "loadBalancing": false,
    "horizontalScaling": false,
    "microservices": false,
    "serverless": false,
    "eventDriven": false
  },
  "inferredRequirements": [
    { "category": "auth", "requirement": "description", "confidence": 0.9, "reasoning": "because..." }
  ],
  "ambiguities": ["list of genuinely unclear aspects that would need clarification"],
  "assumptions": ["list of assumptions made during analysis"]
}`;

// ─── Fallback understanding for error cases ────────────────────────────────────

function buildFallbackUnderstanding(rawRequest: string): ProjectUnderstanding {
  return {
    projectType: "web-app",
    businessDomain: "general",
    targetUsers: "end users",
    complexity: "moderate",
    confidence: 0.3,
    frontend: { required: true, framework: "React", styling: "Tailwind", pages: ["Home", "Dashboard"], hasAuth: true, hasDashboard: false, hasStaticPages: false, routing: "client-side", stateManagement: "Context API" },
    backend: { required: true, framework: "Express", language: "TypeScript", hasRestApi: true, hasWebSockets: false, hasGraphQL: false, hasQueues: false, hasWorkers: false, serverless: false },
    database: { required: true, type: "PostgreSQL", orm: "Drizzle", tables: ["users"], requiresMigrations: true, requiresSeeding: false, caching: false },
    auth: { required: true, provider: "JWT", roles: ["user", "admin"], hasEmailVerification: false, hasMfa: false, hasSocialLogin: false, sessionManagement: "stateless" },
    apis: { externalApis: [], webhooks: false, rateLimit: true, versioning: false, documentation: true },
    integrations: [],
    deployment: { platform: "Replit", containerized: false, hasCI: false, environments: ["development", "production"], region: "us-east", cdn: false, monitoring: false },
    security: { cors: true, helmet: true, csrfProtection: false, encryption: false, inputSanitization: true, xssProtection: true, sqlInjectionProtection: true, rateLimit: true },
    performance: { caching: false, cdn: false, lazyLoading: false, codeSplitting: false, imageOptimization: false, ssr: false },
    scalability: { loadBalancing: false, horizontalScaling: false, microservices: false, serverless: false, eventDriven: false },
    inferredRequirements: [],
    ambiguities: [],
    assumptions: ["Minimal requirements inferred due to parse error"],
    rawRequest,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function analyzeProject(rawRequest: string, signal?: AbortSignal): Promise<ProjectUnderstanding> {
  const start = Date.now();

  const result = await callWithFallback({
    agentType: "research",
    systemPrompt: ANALYZER_SYSTEM_PROMPT,
    preferredModelIds: ["kimi-k2", "deepseek-v3", "gpt4o-mini"],
    request: {
      messages: [{ role: "user", content: `Analyze this project request:\n\n${rawRequest}` }],
      signal,
    },
    start,
  });

  if (result.error) {
    console.warn("[ProjectAnalyzer] LLM call failed, using fallback understanding");
    return buildFallbackUnderstanding(rawRequest);
  }

  const parsed = extractJson(result.content);
  if (!parsed || typeof parsed !== "object") {
    console.warn("[ProjectAnalyzer] Failed to parse JSON from LLM response, using fallback");
    return buildFallbackUnderstanding(rawRequest);
  }

  const p = parsed as Record<string, unknown>;

  const fe = (p["frontend"] as Record<string, unknown>) ?? {};
  const be = (p["backend"] as Record<string, unknown>) ?? {};
  const db = (p["database"] as Record<string, unknown>) ?? {};
  const auth = (p["auth"] as Record<string, unknown>) ?? {};
  const apis = (p["apis"] as Record<string, unknown>) ?? {};
  const depl = (p["deployment"] as Record<string, unknown>) ?? {};
  const sec = (p["security"] as Record<string, unknown>) ?? {};
  const perf = (p["performance"] as Record<string, unknown>) ?? {};
  const scale = (p["scalability"] as Record<string, unknown>) ?? {};

  const inferred = Array.isArray(p["inferredRequirements"])
    ? (p["inferredRequirements"] as Record<string, unknown>[]).map((r) => ({
        category: safeStr(r["category"], "general"),
        requirement: safeStr(r["requirement"], ""),
        confidence: typeof r["confidence"] === "number" ? r["confidence"] : 0.8,
        reasoning: safeStr(r["reasoning"], ""),
      }))
    : [];

  return {
    projectType: safeStr(p["projectType"], "web-app") as ProjectUnderstanding["projectType"],
    businessDomain: safeStr(p["businessDomain"], "general"),
    targetUsers: safeStr(p["targetUsers"], "end users"),
    complexity: safeStr(p["complexity"], "moderate") as ProjectUnderstanding["complexity"],
    confidence: typeof p["confidence"] === "number" ? p["confidence"] : 0.7,
    frontend: {
      required: safeBool(fe["required"], true),
      framework: safeStr(fe["framework"], "React"),
      styling: safeStr(fe["styling"], "Tailwind"),
      pages: safeArr(fe["pages"]),
      hasAuth: safeBool(fe["hasAuth"], false),
      hasDashboard: safeBool(fe["hasDashboard"], false),
      hasStaticPages: safeBool(fe["hasStaticPages"], false),
      routing: safeStr(fe["routing"], "client-side"),
      stateManagement: safeStr(fe["stateManagement"], "Context API"),
    },
    backend: {
      required: safeBool(be["required"], true),
      framework: safeStr(be["framework"], "Express"),
      language: safeStr(be["language"], "TypeScript"),
      hasRestApi: safeBool(be["hasRestApi"], true),
      hasWebSockets: safeBool(be["hasWebSockets"], false),
      hasGraphQL: safeBool(be["hasGraphQL"], false),
      hasQueues: safeBool(be["hasQueues"], false),
      hasWorkers: safeBool(be["hasWorkers"], false),
      serverless: safeBool(be["serverless"], false),
    },
    database: {
      required: safeBool(db["required"], true),
      type: safeStr(db["type"], "PostgreSQL"),
      orm: safeStr(db["orm"], "Drizzle"),
      tables: safeArr(db["tables"]),
      requiresMigrations: safeBool(db["requiresMigrations"], true),
      requiresSeeding: safeBool(db["requiresSeeding"], false),
      caching: safeBool(db["caching"], false),
    },
    auth: {
      required: safeBool(auth["required"], false),
      provider: safeStr(auth["provider"], "JWT"),
      roles: safeArr(auth["roles"]),
      hasEmailVerification: safeBool(auth["hasEmailVerification"], false),
      hasMfa: safeBool(auth["hasMfa"], false),
      hasSocialLogin: safeBool(auth["hasSocialLogin"], false),
      sessionManagement: safeStr(auth["sessionManagement"], "stateless"),
    },
    apis: {
      externalApis: safeArr(apis["externalApis"]),
      webhooks: safeBool(apis["webhooks"], false),
      rateLimit: safeBool(apis["rateLimit"], true),
      versioning: safeBool(apis["versioning"], false),
      documentation: safeBool(apis["documentation"], true),
    },
    integrations: safeArr(p["integrations"]),
    deployment: {
      platform: safeStr(depl["platform"], "Replit"),
      containerized: safeBool(depl["containerized"], false),
      hasCI: safeBool(depl["hasCI"], false),
      environments: safeArr(depl["environments"]).length > 0 ? safeArr(depl["environments"]) : ["development", "production"],
      region: safeStr(depl["region"], "us-east"),
      cdn: safeBool(depl["cdn"], false),
      monitoring: safeBool(depl["monitoring"], false),
    },
    security: {
      cors: safeBool(sec["cors"], true),
      helmet: safeBool(sec["helmet"], true),
      csrfProtection: safeBool(sec["csrfProtection"], false),
      encryption: safeBool(sec["encryption"], false),
      inputSanitization: safeBool(sec["inputSanitization"], true),
      xssProtection: safeBool(sec["xssProtection"], true),
      sqlInjectionProtection: safeBool(sec["sqlInjectionProtection"], true),
      rateLimit: safeBool(sec["rateLimit"], true),
    },
    performance: {
      caching: safeBool(perf["caching"], false),
      cdn: safeBool(perf["cdn"], false),
      lazyLoading: safeBool(perf["lazyLoading"], false),
      codeSplitting: safeBool(perf["codeSplitting"], false),
      imageOptimization: safeBool(perf["imageOptimization"], false),
      ssr: safeBool(perf["ssr"], false),
    },
    scalability: {
      loadBalancing: safeBool(scale["loadBalancing"], false),
      horizontalScaling: safeBool(scale["horizontalScaling"], false),
      microservices: safeBool(scale["microservices"], false),
      serverless: safeBool(scale["serverless"], false),
      eventDriven: safeBool(scale["eventDriven"], false),
    },
    inferredRequirements: inferred,
    ambiguities: safeArr(p["ambiguities"]),
    assumptions: safeArr(p["assumptions"]),
    rawRequest,
    analyzedAt: new Date().toISOString(),
  };
}
