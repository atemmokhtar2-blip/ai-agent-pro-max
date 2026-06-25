/**
 * Specification Engine — Type Definitions
 *
 * The ExecutionSpec is the internal source of truth for every generation step.
 * It is never exposed unless explicitly requested.
 */

import type { ProjectUnderstanding } from "../understanding/types.js";

export interface SpecFeature {
  id: string;
  name: string;
  description: string;
  priority: "must-have" | "should-have" | "nice-to-have";
  category: "frontend" | "backend" | "database" | "auth" | "integration" | "infra";
  implementationHints?: string[];
}

export interface SpecPage {
  name: string;
  route: string;
  description: string;
  components: string[];
  requiresAuth: boolean;
  roles?: string[];
  seoTitle?: string;
  layout?: string;
}

export interface SpecComponent {
  name: string;
  type: "page" | "layout" | "ui" | "form" | "modal" | "widget" | "hook" | "context" | "util";
  description: string;
  filePath: string;
  props?: string[];
  usedIn?: string[];
  dependencies?: string[];
}

export interface FolderNode {
  name: string;
  type: "dir" | "file";
  description?: string;
  purpose?: string;
  children?: FolderNode[];
}

export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string;
  references?: string;
  description?: string;
}

export interface DbTable {
  name: string;
  description: string;
  columns: DbColumn[];
  indexes?: string[];
  relations?: string[];
}

export interface ApiContract {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requiresAuth: boolean;
  roles?: string[];
  requestBody?: Record<string, string>;
  queryParams?: Record<string, string>;
  responseShape?: Record<string, string>;
  statusCodes: number[];
}

export interface UserRole {
  name: string;
  description: string;
  permissions: string[];
  isDefault?: boolean;
}

export interface Permission {
  name: string;
  resource: string;
  actions: string[];
}

export interface PackageDependency {
  name: string;
  version: string;
  type: "runtime" | "dev";
  purpose: string;
}

export interface DeploymentPlan {
  platform: string;
  strategy: "direct" | "containerized" | "serverless" | "hybrid";
  stages: string[];
  envVars: string[];
  buildCommand: string;
  startCommand: string;
  healthCheckPath: string;
}

export interface RoadmapPhase {
  phase: number;
  name: string;
  description: string;
  tasks: string[];
  deliverables: string[];
  estimatedHours?: number;
}

export interface ExecutionSpec {
  id: string;
  conversationId: string;
  projectId?: string;
  summary: string;
  projectType: string;
  techStack: string[];

  features: SpecFeature[];
  pages: SpecPage[];
  components: SpecComponent[];
  folderStructure: FolderNode[];
  dbSchema: DbTable[];
  apiContracts: ApiContract[];
  userRoles: UserRole[];
  permissions: Permission[];
  dependencies: PackageDependency[];
  deploymentPlan: DeploymentPlan;
  developmentRoadmap: RoadmapPhase[];

  understanding: ProjectUnderstanding;
  generatedAt: string;
  version: number;
}

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category:
    | "missing_module"
    | "missing_api"
    | "dependency_conflict"
    | "circular_import"
    | "scalability"
    | "performance"
    | "security"
    | "completeness"
    | "consistency";
  description: string;
  location?: string;
  autoFixable: boolean;
  fix?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  autoFixedCount: number;
  summary: string;
  validatedAt: string;
}

// ─── Execution ─────────────────────────────────────────────────────────────────

export type PhaseStatus = "pending" | "running" | "reviewing" | "completed" | "failed" | "skipped";

export interface PhaseTask {
  id: string;
  name: string;
  status: PhaseStatus;
  description: string;
  output?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ReviewFinding {
  type: "build_error" | "type_error" | "lint_error" | "runtime_error" | "performance" | "accessibility" | "security" | "duplicate" | "missing_feature";
  severity: "critical" | "major" | "minor";
  description: string;
  autoFixed: boolean;
  fix?: string;
}

export interface ReviewResult {
  passed: boolean;
  score: number;
  findings: ReviewFinding[];
  autoFixedCount: number;
  summary: string;
}

export interface ExecutionPhaseInfo {
  phaseNumber: number;
  phaseName: string;
  description: string;
  status: PhaseStatus;
  tasks: PhaseTask[];
  reviewResult?: ReviewResult;
  artifacts: string[];
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface VerificationReport {
  passed: boolean;
  buildStatus: "success" | "failure" | "skipped";
  typeCheckStatus: "success" | "failure" | "skipped";
  lintStatus: "success" | "failure" | "skipped";
  dependencyStatus: "success" | "failure" | "skipped";
  routeValidationStatus: "success" | "failure" | "skipped";
  apiValidationStatus: "success" | "failure" | "skipped";
  criticalIssues: string[];
  productionReady: boolean;
  summary: string;
  verifiedAt: string;
}
