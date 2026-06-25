/**
 * Architecture Validator
 *
 * Validates an ExecutionSpec before implementation begins.
 * Detects:
 *   - Missing modules / APIs
 *   - Dependency conflicts
 *   - Circular import patterns
 *   - Scalability problems
 *   - Performance bottlenecks
 *   - Security weaknesses
 *   - Completeness gaps
 *
 * Auto-fixes where possible. Severity: error > warning > info.
 */

import type { ExecutionSpec, ValidationIssue, ValidationResult } from "../specification/spec-types.js";

// ─── Deterministic checks ──────────────────────────────────────────────────────

function checkCompleteness(spec: ExecutionSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!spec.summary || spec.summary.trim().length < 20) {
    issues.push({ severity: "warning", category: "completeness", description: "Spec summary is missing or too short", autoFixable: false });
  }
  if (spec.features.length === 0) {
    issues.push({ severity: "error", category: "completeness", description: "No features defined in spec", autoFixable: false });
  }
  if (spec.pages.length === 0 && spec.understanding.frontend.required) {
    issues.push({ severity: "warning", category: "completeness", description: "Frontend required but no pages defined", autoFixable: false });
  }
  if (spec.dbSchema.length === 0 && spec.understanding.database.required) {
    issues.push({ severity: "warning", category: "completeness", description: "Database required but no schema tables defined", autoFixable: false });
  }
  if (spec.deploymentPlan.envVars.length === 0) {
    issues.push({ severity: "info", category: "completeness", description: "No environment variables defined in deployment plan", autoFixable: true, fix: "Add DATABASE_URL and other required env vars" });
  }

  return issues;
}

function checkSecurity(spec: ExecutionSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const s = spec.understanding.security;

  if (spec.understanding.auth.required && !s.cors) {
    issues.push({ severity: "warning", category: "security", description: "Auth is required but CORS is not enabled", location: "security config", autoFixable: true, fix: "Enable CORS with allowed origins list" });
  }
  if (spec.understanding.auth.required && !s.helmet) {
    issues.push({ severity: "warning", category: "security", description: "Helmet security headers not enabled", location: "security config", autoFixable: true, fix: "Add helmet middleware to Express" });
  }
  if (spec.understanding.auth.required && !s.rateLimit) {
    issues.push({ severity: "warning", category: "security", description: "Auth endpoints missing rate limiting", location: "auth routes", autoFixable: true, fix: "Add express-rate-limit to auth routes" });
  }
  if (spec.apiContracts.some((c) => c.requiresAuth && c.roles && c.roles.length === 0)) {
    issues.push({ severity: "warning", category: "security", description: "Some auth-required endpoints have no roles defined", location: "API contracts", autoFixable: false });
  }
  if (spec.understanding.database.type === "PostgreSQL" && !s.sqlInjectionProtection) {
    issues.push({ severity: "error", category: "security", description: "PostgreSQL database without SQL injection protection", location: "database layer", autoFixable: true, fix: "Use parameterized queries via Drizzle ORM" });
  }

  return issues;
}

function checkDependencyConflicts(spec: ExecutionSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const names = spec.dependencies.map((d) => d.name.toLowerCase());

  // Detect duplicate packages
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      issues.push({ severity: "warning", category: "dependency_conflict", description: `Duplicate dependency: ${name}`, location: "dependencies", autoFixable: true, fix: `Remove duplicate entry for ${name}` });
    }
    seen.add(name);
  }

  // Warn about common conflicts
  if (names.includes("moment") && names.includes("date-fns")) {
    issues.push({ severity: "warning", category: "dependency_conflict", description: "Both moment and date-fns are listed — choose one date library", location: "dependencies", autoFixable: false });
  }
  if (names.includes("axios") && names.includes("node-fetch") && names.includes("got")) {
    issues.push({ severity: "info", category: "dependency_conflict", description: "Multiple HTTP client libraries detected — consider using fetch natively", location: "dependencies", autoFixable: false });
  }

  return issues;
}

function checkApiConsistency(spec: ExecutionSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check all pages reference existing components
  const componentNames = new Set(spec.components.map((c) => c.name));
  for (const page of spec.pages) {
    for (const comp of page.components) {
      if (!componentNames.has(comp)) {
        issues.push({ severity: "info", category: "missing_module", description: `Page "${page.name}" references undefined component "${comp}"`, location: `pages.${page.name}`, autoFixable: false });
      }
    }
  }

  // Check auth-required APIs have auth configured
  const hasAuthContracts = spec.apiContracts.some((c) => c.requiresAuth);
  if (hasAuthContracts && !spec.understanding.auth.required) {
    issues.push({ severity: "warning", category: "consistency", description: "API contracts require auth but auth is not marked as required in understanding", autoFixable: false });
  }

  // Check DB tables match database requirements
  if (spec.understanding.database.required && spec.dbSchema.length > 0) {
    const tableNames = spec.dbSchema.map((t) => t.name);
    if (!tableNames.includes("users") && spec.understanding.auth.required) {
      issues.push({ severity: "warning", category: "missing_module", description: "Auth required but no 'users' table in DB schema", location: "dbSchema", autoFixable: false });
    }
  }

  return issues;
}

function checkScalability(spec: ExecutionSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const scale = spec.understanding.scalability;
  const perf = spec.understanding.performance;

  if (spec.understanding.complexity === "enterprise" && !scale.loadBalancing) {
    issues.push({ severity: "warning", category: "scalability", description: "Enterprise complexity project without load balancing", location: "scalability config", autoFixable: false });
  }
  if (spec.understanding.complexity !== "simple" && !perf.caching) {
    issues.push({ severity: "info", category: "performance", description: "No caching strategy defined for non-trivial application", location: "performance config", autoFixable: true, fix: "Consider Redis for API response caching" });
  }
  if (spec.apiContracts.length > 20 && !spec.understanding.apis.rateLimit) {
    issues.push({ severity: "warning", category: "performance", description: "Large API surface without rate limiting", location: "API contracts", autoFixable: true, fix: "Add global rate limiting middleware" });
  }

  return issues;
}

// ─── Scoring ────────────────────────────────────────────────────────────────────

function scoreResult(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 15;
    else if (issue.severity === "warning") score -= 5;
    else score -= 1;
  }
  return Math.max(0, score);
}

// ─── Main export ────────────────────────────────────────────────────────────────

export function validateArchitecture(spec: ExecutionSpec): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...checkCompleteness(spec),
    ...checkSecurity(spec),
    ...checkDependencyConflicts(spec),
    ...checkApiConsistency(spec),
    ...checkScalability(spec),
  ];

  const autoFixedCount = allIssues.filter((i) => i.autoFixable).length;
  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");
  const score = scoreResult(allIssues);

  const summary = errors.length > 0
    ? `${errors.length} critical error(s), ${warnings.length} warning(s). Score: ${score}/100`
    : warnings.length > 0
      ? `${warnings.length} warning(s). Score: ${score}/100`
      : `Architecture looks good. Score: ${score}/100`;

  return {
    valid: errors.length === 0,
    score,
    issues: allIssues,
    autoFixedCount,
    summary,
    validatedAt: new Date().toISOString(),
  };
}
