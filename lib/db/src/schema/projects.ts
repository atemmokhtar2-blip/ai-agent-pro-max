import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";

export const projectTypeEnum = ["website", "bot"] as const;
export type ProjectType = typeof projectTypeEnum[number];

export const projectStatusEnum = ["draft", "active", "archived"] as const;
export type ProjectStatus = typeof projectStatusEnum[number];

export const projectMemberRoleEnum = ["owner", "editor", "viewer"] as const;
export type ProjectMemberRole = typeof projectMemberRoleEnum[number];

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  projectType: text("project_type").notNull().default("website"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectMembersTable = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("viewer"),
  invitedBy: text("invited_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  owner: one(usersTable, { fields: [projectsTable.userId], references: [usersTable.id] }),
  members: many(projectMembersTable),
}));

export const projectMembersRelations = relations(projectMembersTable, ({ one }) => ({
  project: one(projectsTable, { fields: [projectMembersTable.projectId], references: [projectsTable.id] }),
  user: one(usersTable, { fields: [projectMembersTable.userId], references: [usersTable.id] }),
  inviter: one(usersTable, { fields: [projectMembersTable.invitedBy], references: [usersTable.id] }),
}));

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
