/**
 * Projects Module
 *
 * Full CRUD for projects including archive, member listing, and stat aggregates.
 */

import { Router } from "express";
import { z } from "zod";
import { db, projectsTable, projectMembersTable, usersTable } from "@workspace/db";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { generateId } from "../lib/auth";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { recordAuditLog } from "../middlewares/audit";
import { eventBus, PlatformEvents } from "../lib/events";

const router = Router();
router.use(authenticate);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProject(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    user_id: p.userId,
    name: p.name,
    description: p.description,
    project_type: p.projectType,
    status: p.status,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

// ─── GET /projects ────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query["per_page"] ?? 20)));
  const offset = (page - 1) * perPage;
  const status = req.query["status"] as string | undefined;
  const projectType = req.query["project_type"] as string | undefined;
  const search = req.query["search"] as string | undefined;

  const conditions = [eq(projectsTable.userId, userId)];
  if (status) conditions.push(eq(projectsTable.status, status));
  if (projectType) conditions.push(eq(projectsTable.projectType, projectType));
  if (search) {
    conditions.push(
      or(
        ilike(projectsTable.name, `%${search}%`),
        ilike(projectsTable.description ?? sql`''`, `%${search}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(projectsTable).where(where).orderBy(desc(projectsTable.updatedAt)).limit(perPage).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(projectsTable).where(where),
  ]);

  res.json({
    items: rows.map(formatProject),
    total: count,
    page,
    per_page: perPage,
  });
});

// ─── POST /projects ───────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  project_type: z.enum(["website", "bot"]),
});

router.post("/", validateBody(createProjectSchema), async (req, res) => {
  const { name, description, project_type } = req.body as z.infer<typeof createProjectSchema>;
  const userId = req.user!.sub;

  const projectId = generateId();
  const [project] = await db
    .insert(projectsTable)
    .values({
      id: projectId,
      userId,
      name,
      description: description ?? null,
      projectType: project_type,
      status: "draft",
    })
    .returning();

  // Add owner as project member
  await db.insert(projectMembersTable).values({
    id: generateId(),
    projectId,
    userId,
    role: "owner",
    invitedBy: null,
  });

  await recordAuditLog("project.created", { userId, metadata: { projectId, name } });
  eventBus.dispatch(PlatformEvents.PROJECT_CREATED, { projectId, userId, name });

  res.status(201).json(formatProject(project));
});

// ─── GET /projects/stats/summary ──────────────────────────────────────────────

router.get("/stats/summary", async (req, res) => {
  const userId = req.user!.sub;

  const rows = await db
    .select({
      status: projectsTable.status,
      projectType: projectsTable.projectType,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .groupBy(projectsTable.status, projectsTable.projectType);

  const stats = {
    total: 0,
    by_status: { draft: 0, active: 0, archived: 0 },
    by_type: { website: 0, bot: 0 },
  };

  for (const row of rows) {
    stats.total += row.count;
    if (row.status in stats.by_status) {
      (stats.by_status as Record<string, number>)[row.status] += row.count;
    }
    if (row.projectType in stats.by_type) {
      (stats.by_type as Record<string, number>)[row.projectType] += row.count;
    }
  }

  res.json(stats);
});

// ─── GET /projects/recent ─────────────────────────────────────────────────────

router.get("/recent", async (req, res) => {
  const userId = req.user!.sub;
  const limit = Math.min(20, Math.max(1, Number(req.query["limit"] ?? 5)));

  const rows = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), or(eq(projectsTable.status, "active"), eq(projectsTable.status, "draft"))!))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(limit);

  res.json(rows.map(formatProject));
});

// ─── GET /projects/:projectId ─────────────────────────────────────────────────

router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.sub;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(formatProject(project));
});

// ─── PATCH /projects/:projectId ───────────────────────────────────────────────

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

router.patch("/:projectId", validateBody(updateProjectSchema), async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.sub;
  const data = req.body as z.infer<typeof updateProjectSchema>;

  const updateData: Partial<typeof projectsTable.$inferInsert> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  const [updated] = await db
    .update(projectsTable)
    .set(updateData)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await recordAuditLog("project.updated", { userId, metadata: { projectId, fields: Object.keys(updateData) } });
  eventBus.dispatch(PlatformEvents.PROJECT_UPDATED, { projectId, userId });

  res.json(formatProject(updated));
});

// ─── DELETE /projects/:projectId ──────────────────────────────────────────────

router.delete("/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.sub;

  const [deleted] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .returning({ id: projectsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await recordAuditLog("project.deleted", { userId, metadata: { projectId } });
  eventBus.dispatch(PlatformEvents.PROJECT_DELETED, { projectId, userId });

  res.json({ message: "Project deleted" });
});

// ─── POST /projects/:projectId/archive ───────────────────────────────────────

router.post("/:projectId/archive", async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.sub;

  const [updated] = await db
    .update(projectsTable)
    .set({ status: "archived" })
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await recordAuditLog("project.archived", { userId, metadata: { projectId } });
  eventBus.dispatch(PlatformEvents.PROJECT_ARCHIVED, { projectId, userId });

  res.json(formatProject(updated));
});

// ─── GET /projects/:projectId/members ─────────────────────────────────────────

router.get("/:projectId/members", async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.sub;

  // Verify project belongs to user
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const members = await db
    .select({
      id: projectMembersTable.id,
      projectId: projectMembersTable.projectId,
      userId: projectMembersTable.userId,
      role: projectMembersTable.role,
      invitedBy: projectMembersTable.invitedBy,
      createdAt: projectMembersTable.createdAt,
      username: usersTable.username,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, projectId));

  res.json(
    members.map((m) => ({
      id: m.id,
      project_id: m.projectId,
      user_id: m.userId,
      role: m.role,
      invited_by: m.invitedBy,
      created_at: m.createdAt.toISOString(),
      user: {
        id: m.userId,
        username: m.username,
        email: m.email,
        avatar_url: m.avatarUrl,
      },
    }))
  );
});

export default router;
