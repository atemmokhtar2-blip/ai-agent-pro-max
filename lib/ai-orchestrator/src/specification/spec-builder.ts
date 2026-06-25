/**
 * Specification Builder
 *
 * Takes a ProjectUnderstanding and generates a complete ExecutionSpec using LLM.
 * The spec is the single source of truth for all subsequent generation phases.
 *
 * Never exposes the spec unless explicitly requested.
 * All generation is driven from this spec — never directly from the user's words.
 */

import { callWithFallback } from "../fallback-engine.js";
import type { ProjectUnderstanding } from "../understanding/types.js";
import type {
  ExecutionSpec,
  SpecFeature,
  SpecPage,
  SpecComponent,
  FolderNode,
  DbTable,
  DbColumn,
  ApiContract,
  UserRole,
  Permission,
  PackageDependency,
  DeploymentPlan,
  RoadmapPhase,
} from "./spec-types.js";

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function safeStr(v: unknown, def = ""): string {
  return typeof v === "string" ? v : def;
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v as T[] : [];
}

// ─── System prompt ──────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a senior software architect. Given a structured project analysis, generate a complete internal execution specification as JSON.

This spec is the single source of truth for all code generation. It must be complete, unambiguous, and production-ready.

Return ONLY valid JSON matching this shape exactly:
{
  "summary": "one-paragraph project summary",
  "projectType": "string",
  "techStack": ["React", "TypeScript", "Express", "PostgreSQL", "Tailwind"],
  "features": [
    { "id": "f1", "name": "User Authentication", "description": "...", "priority": "must-have", "category": "auth", "implementationHints": ["use JWT", "refresh tokens"] }
  ],
  "pages": [
    { "name": "Dashboard", "route": "/dashboard", "description": "...", "components": ["Sidebar", "StatsCard"], "requiresAuth": true, "roles": ["user"], "layout": "DashboardLayout" }
  ],
  "components": [
    { "name": "Sidebar", "type": "layout", "description": "...", "filePath": "src/components/Sidebar.tsx", "props": ["collapsed", "onToggle"], "usedIn": ["Dashboard"] }
  ],
  "folderStructure": [
    { "name": "src", "type": "dir", "description": "Frontend source", "children": [
      { "name": "components", "type": "dir", "description": "Shared UI components" },
      { "name": "pages", "type": "dir", "description": "Route pages" }
    ]}
  ],
  "dbSchema": [
    { "name": "users", "description": "...", "columns": [
      { "name": "id", "type": "uuid", "nullable": false, "primaryKey": true },
      { "name": "email", "type": "varchar(255)", "nullable": false, "unique": true }
    ], "indexes": ["email"], "relations": ["posts.user_id -> users.id"] }
  ],
  "apiContracts": [
    { "method": "POST", "path": "/api/v1/auth/login", "description": "...", "requiresAuth": false, "requestBody": {"email": "string", "password": "string"}, "responseShape": {"token": "string", "user": "object"}, "statusCodes": [200, 400, 401] }
  ],
  "userRoles": [
    { "name": "user", "description": "...", "permissions": ["read:own", "write:own"], "isDefault": true }
  ],
  "permissions": [
    { "name": "read:own", "resource": "profile", "actions": ["read"] }
  ],
  "dependencies": [
    { "name": "express", "version": "^5.0.0", "type": "runtime", "purpose": "HTTP server" }
  ],
  "deploymentPlan": {
    "platform": "Replit",
    "strategy": "direct",
    "stages": ["build", "test", "deploy"],
    "envVars": ["DATABASE_URL", "JWT_SECRET"],
    "buildCommand": "pnpm build",
    "startCommand": "node dist/index.js",
    "healthCheckPath": "/health"
  },
  "developmentRoadmap": [
    { "phase": 1, "name": "Foundation", "description": "...", "tasks": ["Setup project", "Configure DB"], "deliverables": ["Working dev server"], "estimatedHours": 4 }
  ]
}`;
}

// ─── Fallback spec ──────────────────────────────────────────────────────────────

function buildFallbackSpec(conversationId: string, understanding: ProjectUnderstanding): ExecutionSpec {
  return {
    id: genId(),
    conversationId,
    summary: `${understanding.projectType} project targeting ${understanding.targetUsers}`,
    projectType: understanding.projectType,
    techStack: [understanding.frontend.framework, understanding.backend.language, understanding.database.type].filter(Boolean),
    features: [
      { id: "f1", name: "Core Application", description: "Main application functionality", priority: "must-have", category: "frontend" },
      { id: "f2", name: "User Authentication", description: "Login and registration", priority: "must-have", category: "auth" },
    ],
    pages: understanding.frontend.pages.map((p, i) => ({ name: p, route: i === 0 ? "/" : `/${p.toLowerCase()}`, description: `${p} page`, components: [], requiresAuth: i > 0 })),
    components: [],
    folderStructure: [
      { name: "src", type: "dir", children: [{ name: "components", type: "dir" }, { name: "pages", type: "dir" }] },
      { name: "server", type: "dir", children: [{ name: "routes", type: "dir" }] },
    ],
    dbSchema: understanding.database.tables.map((t) => ({ name: t, description: `${t} table`, columns: [{ name: "id", type: "text", nullable: false, primaryKey: true }] })),
    apiContracts: [],
    userRoles: understanding.auth.roles.map((r, i) => ({ name: r, description: `${r} role`, permissions: [], isDefault: i === 0 })),
    permissions: [],
    dependencies: [],
    deploymentPlan: { platform: understanding.deployment.platform, strategy: "direct", stages: ["build", "deploy"], envVars: ["DATABASE_URL"], buildCommand: "pnpm build", startCommand: "node dist/index.js", healthCheckPath: "/health" },
    developmentRoadmap: [{ phase: 1, name: "Foundation", description: "Project setup", tasks: ["Initialize project", "Setup database"], deliverables: ["Working dev environment"], estimatedHours: 4 }],
    understanding,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}

// ─── Main export ────────────────────────────────────────────────────────────────

export async function buildSpec(
  conversationId: string,
  understanding: ProjectUnderstanding,
  signal?: AbortSignal,
): Promise<ExecutionSpec> {
  const start = Date.now();

  const userContent = `Build a complete execution specification for this project:

PROJECT ANALYSIS:
${JSON.stringify(understanding, null, 2)}

Generate a detailed, production-ready spec. Every section must be complete — no placeholders.`;

  const result = await callWithFallback({
    agentType: "planner",
    systemPrompt: buildSystemPrompt(),
    preferredModelIds: ["kimi-k2", "deepseek-v3", "gpt4o-mini"],
    request: {
      messages: [{ role: "user", content: userContent }],
      signal,
    },
    start,
  });

  if (result.error) {
    console.warn("[SpecBuilder] LLM call failed, using fallback spec");
    return buildFallbackSpec(conversationId, understanding);
  }

  const parsed = extractJson(result.content);
  if (!parsed || typeof parsed !== "object") {
    console.warn("[SpecBuilder] Failed to parse JSON, using fallback spec");
    return buildFallbackSpec(conversationId, understanding);
  }

  const p = parsed as Record<string, unknown>;

  const features: SpecFeature[] = safeArr<Record<string, unknown>>(p["features"]).map((f) => ({
    id: safeStr(f["id"], genId()),
    name: safeStr(f["name"], "Feature"),
    description: safeStr(f["description"]),
    priority: (safeStr(f["priority"], "must-have")) as SpecFeature["priority"],
    category: (safeStr(f["category"], "frontend")) as SpecFeature["category"],
    implementationHints: Array.isArray(f["implementationHints"]) ? f["implementationHints"] as string[] : [],
  }));

  const pages: SpecPage[] = safeArr<Record<string, unknown>>(p["pages"]).map((pg) => ({
    name: safeStr(pg["name"], "Page"),
    route: safeStr(pg["route"], "/"),
    description: safeStr(pg["description"]),
    components: Array.isArray(pg["components"]) ? pg["components"] as string[] : [],
    requiresAuth: typeof pg["requiresAuth"] === "boolean" ? pg["requiresAuth"] : false,
    roles: Array.isArray(pg["roles"]) ? pg["roles"] as string[] : undefined,
    seoTitle: typeof pg["seoTitle"] === "string" ? pg["seoTitle"] : undefined,
    layout: typeof pg["layout"] === "string" ? pg["layout"] : undefined,
  }));

  const components: SpecComponent[] = safeArr<Record<string, unknown>>(p["components"]).map((c) => ({
    name: safeStr(c["name"], "Component"),
    type: (safeStr(c["type"], "ui")) as SpecComponent["type"],
    description: safeStr(c["description"]),
    filePath: safeStr(c["filePath"], `src/components/${safeStr(c["name"])}.tsx`),
    props: Array.isArray(c["props"]) ? c["props"] as string[] : [],
    usedIn: Array.isArray(c["usedIn"]) ? c["usedIn"] as string[] : [],
    dependencies: Array.isArray(c["dependencies"]) ? c["dependencies"] as string[] : [],
  }));

  const dbSchema: DbTable[] = safeArr<Record<string, unknown>>(p["dbSchema"]).map((t) => ({
    name: safeStr(t["name"], "table"),
    description: safeStr(t["description"]),
    columns: safeArr<Record<string, unknown>>(t["columns"]).map((col): DbColumn => ({
      name: safeStr(col["name"], "column"),
      type: safeStr(col["type"], "text"),
      nullable: typeof col["nullable"] === "boolean" ? col["nullable"] : true,
      primaryKey: typeof col["primaryKey"] === "boolean" ? col["primaryKey"] : false,
      unique: typeof col["unique"] === "boolean" ? col["unique"] : false,
      default: typeof col["default"] === "string" ? col["default"] : undefined,
      references: typeof col["references"] === "string" ? col["references"] : undefined,
      description: typeof col["description"] === "string" ? col["description"] : undefined,
    })),
    indexes: Array.isArray(t["indexes"]) ? t["indexes"] as string[] : [],
    relations: Array.isArray(t["relations"]) ? t["relations"] as string[] : [],
  }));

  const apiContracts: ApiContract[] = safeArr<Record<string, unknown>>(p["apiContracts"]).map((c) => ({
    method: (safeStr(c["method"], "GET")) as ApiContract["method"],
    path: safeStr(c["path"], "/api"),
    description: safeStr(c["description"]),
    requiresAuth: typeof c["requiresAuth"] === "boolean" ? c["requiresAuth"] : false,
    roles: Array.isArray(c["roles"]) ? c["roles"] as string[] : undefined,
    requestBody: typeof c["requestBody"] === "object" ? c["requestBody"] as Record<string, string> : undefined,
    queryParams: typeof c["queryParams"] === "object" ? c["queryParams"] as Record<string, string> : undefined,
    responseShape: typeof c["responseShape"] === "object" ? c["responseShape"] as Record<string, string> : undefined,
    statusCodes: Array.isArray(c["statusCodes"]) ? c["statusCodes"] as number[] : [200],
  }));

  const userRoles: UserRole[] = safeArr<Record<string, unknown>>(p["userRoles"]).map((r) => ({
    name: safeStr(r["name"], "user"),
    description: safeStr(r["description"]),
    permissions: Array.isArray(r["permissions"]) ? r["permissions"] as string[] : [],
    isDefault: typeof r["isDefault"] === "boolean" ? r["isDefault"] : false,
  }));

  const permissions: Permission[] = safeArr<Record<string, unknown>>(p["permissions"]).map((perm) => ({
    name: safeStr(perm["name"], "permission"),
    resource: safeStr(perm["resource"], "resource"),
    actions: Array.isArray(perm["actions"]) ? perm["actions"] as string[] : [],
  }));

  const dependencies: PackageDependency[] = safeArr<Record<string, unknown>>(p["dependencies"]).map((dep) => ({
    name: safeStr(dep["name"], "package"),
    version: safeStr(dep["version"], "latest"),
    type: (safeStr(dep["type"], "runtime")) as PackageDependency["type"],
    purpose: safeStr(dep["purpose"]),
  }));

  const rawDepl = (p["deploymentPlan"] as Record<string, unknown>) ?? {};
  const deploymentPlan: DeploymentPlan = {
    platform: safeStr(rawDepl["platform"], understanding.deployment.platform),
    strategy: (safeStr(rawDepl["strategy"], "direct")) as DeploymentPlan["strategy"],
    stages: Array.isArray(rawDepl["stages"]) ? rawDepl["stages"] as string[] : ["build", "deploy"],
    envVars: Array.isArray(rawDepl["envVars"]) ? rawDepl["envVars"] as string[] : ["DATABASE_URL"],
    buildCommand: safeStr(rawDepl["buildCommand"], "pnpm build"),
    startCommand: safeStr(rawDepl["startCommand"], "node dist/index.js"),
    healthCheckPath: safeStr(rawDepl["healthCheckPath"], "/health"),
  };

  const roadmap: RoadmapPhase[] = safeArr<Record<string, unknown>>(p["developmentRoadmap"]).map((rp) => ({
    phase: typeof rp["phase"] === "number" ? rp["phase"] : 1,
    name: safeStr(rp["name"], "Phase"),
    description: safeStr(rp["description"]),
    tasks: Array.isArray(rp["tasks"]) ? rp["tasks"] as string[] : [],
    deliverables: Array.isArray(rp["deliverables"]) ? rp["deliverables"] as string[] : [],
    estimatedHours: typeof rp["estimatedHours"] === "number" ? rp["estimatedHours"] : undefined,
  }));

  const folderStructure: FolderNode[] = safeArr<FolderNode>(p["folderStructure"]);

  return {
    id: genId(),
    conversationId,
    summary: safeStr(p["summary"], `${understanding.projectType} application`),
    projectType: safeStr(p["projectType"], understanding.projectType),
    techStack: Array.isArray(p["techStack"]) ? p["techStack"] as string[] : [],
    features,
    pages,
    components,
    folderStructure,
    dbSchema,
    apiContracts,
    userRoles,
    permissions,
    dependencies,
    deploymentPlan,
    developmentRoadmap: roadmap,
    understanding,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}
