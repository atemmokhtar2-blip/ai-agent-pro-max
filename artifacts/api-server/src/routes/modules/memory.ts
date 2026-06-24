/**
 * Memory Module — Architecture Placeholder
 *
 * Future capabilities:
 *   - Persistent project memory for AI continuity
 *   - Key-value memory store scoped by project/session/agent
 *   - Memory retrieval for context injection
 *   - Memory expiration and TTL management
 *   - Semantic search over memory (vector embeddings)
 *
 * Phase 1: Returns 501 for all endpoints. Schema ready in @workspace/db.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const notImplemented = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(501).json({
    error: "Memory module not yet implemented",
    module: "memory",
    phase: "Phase 2+",
    description: "Project memory system for AI agent context and continuity",
  });
};

router.get("/projects/:projectId", notImplemented);
router.get("/projects/:projectId/:key", notImplemented);
router.put("/projects/:projectId/:key", notImplemented);
router.delete("/projects/:projectId/:key", notImplemented);
router.post("/projects/:projectId/search", notImplemented);

export default router;
