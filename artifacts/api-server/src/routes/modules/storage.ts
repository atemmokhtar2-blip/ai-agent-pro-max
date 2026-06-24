/**
 * Storage Module — Architecture Placeholder
 *
 * Future capabilities:
 *   - File upload/download via abstracted provider (S3, GCS, local, Git, HuggingFace)
 *   - Presigned URL generation for direct browser uploads
 *   - Project file management
 *   - Storage quota tracking
 *
 * Phase 1: Returns 501 for all endpoints.
 *          Storage abstraction interface is fully defined in src/lib/storage.ts.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const notImplemented = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(501).json({
    error: "Storage module not yet implemented",
    module: "storage",
    phase: "Phase 2+",
    description: "Multi-provider file storage (S3, GCS, Git, HuggingFace, local)",
  });
};

router.post("/upload", notImplemented);
router.get("/files/:key", notImplemented);
router.delete("/files/:key", notImplemented);
router.post("/presigned-url", notImplemented);
router.get("/projects/:projectId/files", notImplemented);

export default router;
