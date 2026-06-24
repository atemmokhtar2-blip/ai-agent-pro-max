/**
 * Agents Module — Architecture Placeholder
 *
 * Future capabilities:
 *   - AI agent registry and management
 *   - Multi-agent orchestration
 *   - Agent task queue with priority scheduling
 *   - Agent capability discovery
 *   - Human-in-the-loop approval workflows
 *   - Agent execution history and audit trail
 *
 * Phase 1: Returns 501 for all endpoints. Schema ready in @workspace/db.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const notImplemented = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(501).json({
    error: "Agents module not yet implemented",
    module: "agents",
    phase: "Phase 4+",
    description: "Multi-agent system, orchestration, and autonomous task execution",
  });
};

router.get("/", notImplemented);
router.get("/:id", notImplemented);
router.post("/:id/invoke", notImplemented);
router.get("/:id/tasks", notImplemented);
router.post("/:id/tasks/:taskId/approve", notImplemented);
router.post("/:id/tasks/:taskId/reject", notImplemented);

export default router;
