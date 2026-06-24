/**
 * Notifications Module
 */

import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { eventBus, PlatformEvents } from "../lib/events";

const router = Router();
router.use(authenticate);

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    is_read: n.isRead,
    created_at: n.createdAt.toISOString(),
  };
}

// ─── GET /notifications ───────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query["per_page"] ?? 20)));
  const offset = (page - 1) * perPage;

  const isReadParam = req.query["is_read"];
  const conditions = [eq(notificationsTable.userId, userId)];
  if (isReadParam !== undefined) {
    conditions.push(eq(notificationsTable.isRead, isReadParam === "true"));
  }

  const where = and(...conditions);

  const [rows, [{ total }], [{ unread }]] = await Promise.all([
    db.select().from(notificationsTable).where(where).orderBy(desc(notificationsTable.createdAt)).limit(perPage).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(notificationsTable).where(where),
    db.select({ unread: sql<number>`count(*)::int` }).from(notificationsTable).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false))),
  ]);

  res.json({
    items: rows.map(formatNotification),
    total,
    page,
    per_page: perPage,
    unread_count: unread,
  });
});

// ─── POST /notifications/:id/read ────────────────────────────────────────────

router.post("/:notificationId/read", async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user!.sub;

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  eventBus.dispatch(PlatformEvents.NOTIFICATION_READ, { notificationId, userId });
  res.json(formatNotification(updated));
});

// ─── POST /notifications/read-all ─────────────────────────────────────────────

router.post("/read-all", async (req, res) => {
  const userId = req.user!.sub;

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  eventBus.dispatch(PlatformEvents.ALL_NOTIFICATIONS_READ, { userId });
  res.json({ message: "All notifications marked as read" });
});

// ─── GET /notifications/unread-count ──────────────────────────────────────────

router.get("/unread-count", async (req, res) => {
  const userId = req.user!.sub;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ count });
});

export default router;
