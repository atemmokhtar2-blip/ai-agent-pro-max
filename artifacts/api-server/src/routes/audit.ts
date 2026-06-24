/**
 * Audit Module
 *
 * Read-only access to audit logs — admin and above only.
 */

import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";

const router = Router();
router.use(authenticate, requireRole("admin"));

// ─── GET /audit/logs ──────────────────────────────────────────────────────────

router.get("/logs", async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const perPage = Math.min(200, Math.max(1, Number(req.query["per_page"] ?? 50)));
  const offset = (page - 1) * perPage;
  const userId = req.query["user_id"] as string | undefined;
  const action = req.query["action"] as string | undefined;

  const conditions = [];
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: auditLogsTable.id,
        userId: auditLogsTable.userId,
        action: auditLogsTable.action,
        metadata: auditLogsTable.metadata,
        createdAt: auditLogsTable.createdAt,
        username: usersTable.username,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
  ]);

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      action: r.action,
      metadata: r.metadata,
      created_at: r.createdAt.toISOString(),
      user: r.username
        ? { id: r.userId, username: r.username, email: r.email, avatar_url: r.avatarUrl }
        : null,
    })),
    total: count,
    page,
    per_page: perPage,
  });
});

export default router;
