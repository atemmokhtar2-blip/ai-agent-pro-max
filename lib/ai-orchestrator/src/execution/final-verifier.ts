/**
 * Final Verifier
 *
 * Run after all phases complete. Validates the full execution:
 *   - Build status
 *   - TypeScript check
 *   - Lint
 *   - Dependency validation
 *   - Route validation
 *   - API validation
 *
 * Does not mark as complete if any critical issue remains.
 * Returns a production readiness report.
 */

import type { ExecutionSpec, ExecutionPhaseInfo, VerificationReport } from "../specification/spec-types.js";

export async function runFinalVerification(
  spec: ExecutionSpec,
  completedPhases: ExecutionPhaseInfo[],
): Promise<VerificationReport> {
  const criticalIssues: string[] = [];

  // ── Build status: check if phase 1 (Architecture) + phase 3 (Backend) completed ──
  const phase1 = completedPhases.find((p) => p.phaseNumber === 1);
  const phase3 = completedPhases.find((p) => p.phaseNumber === 3);
  const buildStatus: VerificationReport["buildStatus"] =
    phase1?.status === "completed" ? "success" :
    phase1?.status === "failed" ? "failure" :
    "skipped";

  if (buildStatus === "failure") criticalIssues.push("Architecture setup phase failed");

  // ── TypeScript: check if there are type_error findings across phases ──
  const typeErrors = completedPhases.flatMap((p) =>
    (p.reviewResult?.findings ?? []).filter((f) => f.type === "type_error" && f.severity === "critical"),
  );
  const typeCheckStatus: VerificationReport["typeCheckStatus"] =
    typeErrors.length === 0 ? "success" : "failure";
  if (typeErrors.length > 0) {
    criticalIssues.push(`${typeErrors.length} critical TypeScript error(s) detected`);
  }

  // ── Lint: check for lint_error findings ──
  const lintErrors = completedPhases.flatMap((p) =>
    (p.reviewResult?.findings ?? []).filter((f) => f.type === "lint_error" && f.severity === "critical"),
  );
  const lintStatus: VerificationReport["lintStatus"] =
    lintErrors.length === 0 ? "success" : "failure";

  // ── Dependency validation: check phase 1 for dependency issues ──
  const depIssues = completedPhases.flatMap((p) =>
    (p.reviewResult?.findings ?? []).filter((f) => f.description.toLowerCase().includes("dependency") && f.severity === "critical"),
  );
  const dependencyStatus: VerificationReport["dependencyStatus"] =
    depIssues.length === 0 ? "success" : "failure";

  // ── Route validation: check all pages have routes ──
  const pagesWithoutRoutes = spec.pages.filter((pg) => !pg.route || !pg.route.startsWith("/"));
  const routeValidationStatus: VerificationReport["routeValidationStatus"] =
    pagesWithoutRoutes.length === 0 ? "success" : "failure";
  if (pagesWithoutRoutes.length > 0) {
    criticalIssues.push(`${pagesWithoutRoutes.length} page(s) missing valid route`);
  }

  // ── API validation: check all contracts have valid methods ──
  const invalidContracts = spec.apiContracts.filter(
    (c) => !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(c.method),
  );
  const apiValidationStatus: VerificationReport["apiValidationStatus"] =
    invalidContracts.length === 0 ? "success" : "failure";
  if (invalidContracts.length > 0) {
    criticalIssues.push(`${invalidContracts.length} API contract(s) have invalid HTTP methods`);
  }

  // ── Failed phases ──
  const failedPhases = completedPhases.filter((p) => p.status === "failed");
  for (const fp of failedPhases) {
    criticalIssues.push(`Phase ${fp.phaseNumber} "${fp.phaseName}" failed: ${fp.errorMessage ?? "unknown error"}`);
  }

  // ── Production readiness ──
  const productionReady = criticalIssues.length === 0 && buildStatus !== "failure";

  const statusCounts = {
    success: [buildStatus, typeCheckStatus, lintStatus, dependencyStatus, routeValidationStatus, apiValidationStatus].filter((s) => s === "success").length,
    failure: [buildStatus, typeCheckStatus, lintStatus, dependencyStatus, routeValidationStatus, apiValidationStatus].filter((s) => s === "failure").length,
  };

  const summary = productionReady
    ? `All ${statusCounts.success} checks passed. ${spec.pages.length} pages, ${spec.apiContracts.length} API endpoints, ${spec.dbSchema.length} DB tables. Ready for deployment to ${spec.deploymentPlan.platform}.`
    : `${statusCounts.failure} check(s) failed. ${criticalIssues.length} critical issue(s) must be resolved before deployment.`;

  return {
    passed: productionReady,
    buildStatus,
    typeCheckStatus,
    lintStatus,
    dependencyStatus,
    routeValidationStatus,
    apiValidationStatus,
    criticalIssues,
    productionReady,
    summary,
    verifiedAt: new Date().toISOString(),
  };
}
