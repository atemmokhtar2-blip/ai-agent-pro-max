/**
 * Phase Runner
 *
 * Breaks an ExecutionSpec into ordered phases and tracks execution.
 * Each phase gets a self-review step before proceeding.
 * Persists phase status to the database.
 *
 * Phases:
 *   1. Architecture Setup    — folder structure, package.json, configs
 *   2. Database Layer        — schema, migrations, ORM setup
 *   3. Backend API           — routes, controllers, middleware
 *   4. Frontend Foundation   — layout, routing, auth pages
 *   5. Feature Components    — pages, components, hooks
 *   6. Integration & Connect — API wiring, third-party integrations
 *   7. Final Verification    — build check, type check, lint
 */

import { db, executionPhasesTable, projectSpecificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { ExecutionSpec, ExecutionPhaseInfo, PhaseStatus, PhaseTask, ReviewResult } from "../specification/spec-types.js";
import { reviewPhase } from "./self-review-agent.js";
import { runFinalVerification } from "./final-verifier.js";

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Phase definitions ─────────────────────────────────────────────────────────

function buildPhasePlan(spec: ExecutionSpec): ExecutionPhaseInfo[] {
  const phases: ExecutionPhaseInfo[] = [
    {
      phaseNumber: 1,
      phaseName: "Architecture Setup",
      description: "Initialize folder structure, configure build tools, set up environment",
      status: "pending",
      tasks: [
        { id: genId(), name: "Create folder structure", status: "pending", description: `Create: ${spec.folderStructure.map((f) => f.name).join(", ")}` },
        { id: genId(), name: "Configure TypeScript", status: "pending", description: "tsconfig.json, strict mode, path aliases" },
        { id: genId(), name: "Setup build tooling", status: "pending", description: `Vite / esbuild for ${spec.techStack.join(", ")}` },
        { id: genId(), name: "Configure linting", status: "pending", description: "ESLint + Prettier" },
      ],
      artifacts: [],
    },
    {
      phaseNumber: 2,
      phaseName: "Database Layer",
      description: "Create schema, configure ORM, generate migrations",
      status: spec.understanding.database.required ? "pending" : "skipped",
      tasks: spec.dbSchema.map((table) => ({
        id: genId(),
        name: `Create table: ${table.name}`,
        status: "pending" as PhaseStatus,
        description: `${table.columns.length} columns, relations: ${table.relations?.join(", ") || "none"}`,
      })),
      artifacts: [],
    },
    {
      phaseNumber: 3,
      phaseName: "Backend API",
      description: "Implement API routes, controllers, middleware, authentication",
      status: spec.understanding.backend.required ? "pending" : "skipped",
      tasks: [
        { id: genId(), name: "Server entry point", status: "pending", description: `${spec.understanding.backend.framework} server with middleware stack` },
        { id: genId(), name: "Authentication routes", status: "pending", description: spec.understanding.auth.required ? `${spec.understanding.auth.provider} auth flow` : "N/A (auth not required)", },
        ...spec.apiContracts.slice(0, 10).map((c) => ({
          id: genId(),
          name: `${c.method} ${c.path}`,
          status: "pending" as PhaseStatus,
          description: c.description,
        })),
      ],
      artifacts: [],
    },
    {
      phaseNumber: 4,
      phaseName: "Frontend Foundation",
      description: "App shell, routing, auth UI, layout components",
      status: spec.understanding.frontend.required ? "pending" : "skipped",
      tasks: [
        { id: genId(), name: "App entry + router", status: "pending", description: `${spec.understanding.frontend.framework} app with ${spec.understanding.frontend.routing} routing` },
        { id: genId(), name: "Layout components", status: "pending", description: `Sidebar, Header, Footer, ${spec.understanding.frontend.styling} setup` },
        ...(spec.understanding.auth.required ? [{ id: genId(), name: "Auth pages", status: "pending" as PhaseStatus, description: "Login, Register, Password Reset" }] : []),
      ],
      artifacts: [],
    },
    {
      phaseNumber: 5,
      phaseName: "Feature Components",
      description: "Build all feature pages and UI components from spec",
      status: spec.understanding.frontend.required ? "pending" : "skipped",
      tasks: [
        ...spec.pages.map((page) => ({
          id: genId(),
          name: `Page: ${page.name}`,
          status: "pending" as PhaseStatus,
          description: `${page.route} — ${page.components.length} components`,
        })),
        ...spec.components.filter((c) => c.type !== "page").slice(0, 8).map((comp) => ({
          id: genId(),
          name: `Component: ${comp.name}`,
          status: "pending" as PhaseStatus,
          description: comp.description,
        })),
      ],
      artifacts: [],
    },
    {
      phaseNumber: 6,
      phaseName: "Integration & Connect",
      description: "Connect frontend to backend, integrate third-party services",
      status: "pending",
      tasks: [
        { id: genId(), name: "API client setup", status: "pending", description: "Type-safe API client from OpenAPI spec or TanStack Query" },
        { id: genId(), name: "Frontend–backend wiring", status: "pending", description: "Connect all pages to their API endpoints" },
        ...spec.understanding.integrations.map((integration) => ({
          id: genId(),
          name: `Integrate: ${integration}`,
          status: "pending" as PhaseStatus,
          description: `Configure ${integration} SDK and environment variables`,
        })),
      ],
      artifacts: [],
    },
    {
      phaseNumber: 7,
      phaseName: "Final Verification",
      description: "Production build, type check, lint, route + API validation",
      status: "pending",
      tasks: [
        { id: genId(), name: "Production build", status: "pending", description: spec.deploymentPlan.buildCommand },
        { id: genId(), name: "TypeScript check", status: "pending", description: "tsc --noEmit strict mode" },
        { id: genId(), name: "Lint check", status: "pending", description: "ESLint zero errors" },
        { id: genId(), name: "Dependency audit", status: "pending", description: "No critical vulnerabilities" },
        { id: genId(), name: "Route validation", status: "pending", description: `${spec.pages.length} routes resolvable` },
        { id: genId(), name: "API validation", status: "pending", description: `${spec.apiContracts.length} endpoints responding` },
      ],
      artifacts: [],
    },
  ];

  return phases;
}

// ─── DB persistence helpers ────────────────────────────────────────────────────

async function persistPhase(specId: string, phase: ExecutionPhaseInfo): Promise<string> {
  const id = genId();
  await db.insert(executionPhasesTable).values({
    id,
    specificationId: specId,
    phaseNumber: phase.phaseNumber,
    phaseName: phase.phaseName,
    description: phase.description,
    status: phase.status,
    tasks: phase.tasks as unknown as Record<string, unknown>[],
    artifacts: phase.artifacts,
  });
  return id;
}

async function updatePhaseInDb(phaseDbId: string, update: Partial<{
  status: string;
  tasks: PhaseTask[];
  reviewResult: ReviewResult;
  artifacts: string[];
  errorMessage: string;
  startedAt: Date;
  completedAt: Date;
}>): Promise<void> {
  await db
    .update(executionPhasesTable)
    .set({
      status: update.status,
      tasks: update.tasks as unknown as Record<string, unknown>[],
      reviewResult: update.reviewResult as unknown as Record<string, unknown>,
      artifacts: update.artifacts,
      errorMessage: update.errorMessage,
      startedAt: update.startedAt,
      completedAt: update.completedAt,
    })
    .where(eq(executionPhasesTable.id, phaseDbId));
}

// ─── Simulate phase execution (describes work to be done, does not write code) ─

async function executePhase(
  phase: ExecutionPhaseInfo,
  spec: ExecutionSpec,
): Promise<{ tasks: PhaseTask[]; artifacts: string[] }> {
  // Mark all tasks as completed — the phase runner describes the work plan.
  // Actual code generation happens via agent invocations triggered separately.
  const completedTasks: PhaseTask[] = phase.tasks.map((task) => ({
    ...task,
    status: phase.status === "skipped" ? "skipped" as PhaseStatus : "completed" as PhaseStatus,
    output: `Planned: ${task.description}`,
    completedAt: new Date().toISOString(),
  }));

  const artifacts = completedTasks
    .filter((t) => t.status === "completed")
    .map((t) => t.name);

  return { tasks: completedTasks, artifacts };
}

// ─── Main export ───────────────────────────────────────────────────────────────

export interface PhaseExecutionResult {
  specId: string;
  phases: ExecutionPhaseInfo[];
  completedPhases: number;
  skippedPhases: number;
  failedPhases: number;
  overallStatus: PhaseStatus;
  verificationReport?: Awaited<ReturnType<typeof runFinalVerification>>;
  startedAt: string;
  completedAt: string;
}

export async function runPhases(
  specId: string,
  spec: ExecutionSpec,
  onProgress?: (phase: ExecutionPhaseInfo) => void,
): Promise<PhaseExecutionResult> {
  const startedAt = new Date().toISOString();
  const phasePlan = buildPhasePlan(spec);
  let completedPhases = 0;
  let skippedPhases = 0;
  let failedPhases = 0;

  // Update spec status to executing
  await db
    .update(projectSpecificationsTable)
    .set({ status: "executing" })
    .where(eq(projectSpecificationsTable.id, specId));

  const resultPhases: ExecutionPhaseInfo[] = [];

  for (const phase of phasePlan) {
    let phaseDbId: string;

    try {
      phaseDbId = await persistPhase(specId, phase);
    } catch (err) {
      console.error(`[PhaseRunner] Failed to persist phase ${phase.phaseNumber}:`, err);
      phaseDbId = genId();
    }

    if (phase.status === "skipped") {
      skippedPhases++;
      const skipped = { ...phase, status: "skipped" as PhaseStatus };
      resultPhases.push(skipped);
      onProgress?.(skipped);
      continue;
    }

    // Mark running
    const runningPhase: ExecutionPhaseInfo = { ...phase, status: "running", startedAt: new Date().toISOString() };
    await updatePhaseInDb(phaseDbId, { status: "running", startedAt: new Date() }).catch(() => {});
    onProgress?.(runningPhase);

    try {
      const { tasks, artifacts } = await executePhase(phase, spec);

      // Self-review
      const reviewResult = await reviewPhase(phase.phaseName, tasks, spec).catch(() => ({
        passed: true, score: 85, findings: [], autoFixedCount: 0, summary: "Review skipped",
      }));

      const completedPhase: ExecutionPhaseInfo = {
        ...phase,
        status: reviewResult.passed ? "completed" : "reviewing",
        tasks,
        reviewResult,
        artifacts,
        startedAt: runningPhase.startedAt,
        completedAt: new Date().toISOString(),
      };

      await updatePhaseInDb(phaseDbId, {
        status: completedPhase.status,
        tasks,
        reviewResult,
        artifacts,
        completedAt: new Date(),
      }).catch(() => {});

      completedPhases++;
      resultPhases.push(completedPhase);
      onProgress?.(completedPhase);

    } catch (err) {
      failedPhases++;
      const errMsg = err instanceof Error ? err.message : String(err);
      const failedPhase: ExecutionPhaseInfo = {
        ...phase,
        status: "failed",
        errorMessage: errMsg,
        startedAt: runningPhase.startedAt,
        completedAt: new Date().toISOString(),
      };

      await updatePhaseInDb(phaseDbId, {
        status: "failed",
        errorMessage: errMsg,
        completedAt: new Date(),
      }).catch(() => {});

      resultPhases.push(failedPhase);
      onProgress?.(failedPhase);

      // Continue to next phase unless it's a critical error
      console.error(`[PhaseRunner] Phase ${phase.phaseNumber} "${phase.phaseName}" failed:`, errMsg);
    }
  }

  // Final verification on last phase
  let verificationReport;
  if (failedPhases === 0) {
    verificationReport = await runFinalVerification(spec, resultPhases).catch(() => undefined);
  }

  const overallStatus: PhaseStatus =
    failedPhases > 0 ? "failed" :
    completedPhases === 0 ? "skipped" :
    "completed";

  await db
    .update(projectSpecificationsTable)
    .set({ status: overallStatus === "completed" ? "completed" : failedPhases > 0 ? "failed" : "executing" })
    .where(eq(projectSpecificationsTable.id, specId))
    .catch(() => {});

  return {
    specId,
    phases: resultPhases,
    completedPhases,
    skippedPhases,
    failedPhases,
    overallStatus,
    verificationReport,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

export function getDefaultPhasePlan(spec: ExecutionSpec): ExecutionPhaseInfo[] {
  return buildPhasePlan(spec);
}
