/**
 * Deployment Module — Architecture Placeholder
 *
 * Future capabilities:
 *   - One-click deployment of websites and bots
 *   - Build pipeline management
 *   - Deployment log streaming
 *   - Environment variable management
 *   - Custom domain configuration
 *   - Rollback support
 *
 * Phase 1: Returns 501 for all endpoints. Schema ready in @workspace/db.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const notImplemented = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(501).json({
    error: "Deployment module not yet implemented",
    module: "deployment",
    phase: "Phase 3+",
    description: "Build pipelines, deployment orchestration, and hosting infrastructure",
  });
};

router.get("/", notImplemented);
router.post("/", notImplemented);
router.get("/:id", notImplemented);
router.get("/:id/logs", notImplemented);
router.post("/:id/cancel", notImplemented);
router.post("/:id/rollback", notImplemented);

export default router;
