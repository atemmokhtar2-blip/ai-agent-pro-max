/**
 * AI Module — Architecture Placeholder
 *
 * Future capabilities:
 *   - AI conversation management (create, list, continue, delete)
 *   - Message streaming via SSE
 *   - Multi-provider routing (OpenAI, Anthropic, Gemini, self-hosted)
 *   - Code generation, website generation, bot creation
 *   - Agent task queue and orchestration
 *
 * Phase 1: Returns 501 for all endpoints. Schema and types are ready in @workspace/db.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const notImplemented = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(501).json({
    error: "AI module not yet implemented",
    module: "ai",
    phase: "Phase 2+",
    description: "AI generation, conversation management, and multi-agent orchestration",
  });
};

router.get("/conversations", notImplemented);
router.post("/conversations", notImplemented);
router.get("/conversations/:id", notImplemented);
router.delete("/conversations/:id", notImplemented);
router.post("/conversations/:id/messages", notImplemented);
router.get("/conversations/:id/messages", notImplemented);
router.get("/providers", notImplemented);
router.post("/generate", notImplemented);

export default router;
