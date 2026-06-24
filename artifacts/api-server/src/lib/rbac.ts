/**
 * Role-Based Access Control (RBAC)
 *
 * Fully expandable permission architecture. Permissions are NOT hardcoded in
 * route guards — they are derived from role definitions at runtime, making it
 * trivial to add new roles and permissions without touching route code.
 *
 * Roles (in ascending order of privilege):
 *   user → moderator → admin → super_admin
 */

// ─── Permission Registry ──────────────────────────────────────────────────────

export const Permissions = {
  // Auth
  AUTH_LOGIN: "auth:login",
  AUTH_REGISTER: "auth:register",

  // Users
  USER_READ_OWN: "user:read:own",
  USER_UPDATE_OWN: "user:update:own",
  USER_READ_ANY: "user:read:any",
  USER_UPDATE_ANY: "user:update:any",
  USER_DEACTIVATE: "user:deactivate",
  USER_CHANGE_ROLE: "user:change_role",

  // Projects
  PROJECT_CREATE: "project:create",
  PROJECT_READ_OWN: "project:read:own",
  PROJECT_UPDATE_OWN: "project:update:own",
  PROJECT_DELETE_OWN: "project:delete:own",
  PROJECT_READ_ANY: "project:read:any",
  PROJECT_UPDATE_ANY: "project:update:any",
  PROJECT_DELETE_ANY: "project:delete:any",

  // Notifications
  NOTIFICATION_READ_OWN: "notification:read:own",
  NOTIFICATION_UPDATE_OWN: "notification:update:own",

  // Admin
  ADMIN_DASHBOARD: "admin:dashboard",
  ADMIN_USER_MANAGEMENT: "admin:user_management",
  ADMIN_PROJECT_MANAGEMENT: "admin:project_management",
  ADMIN_AUDIT_LOGS: "admin:audit_logs",
  ADMIN_SYSTEM_STATS: "admin:system_stats",

  // Super Admin
  SUPER_ADMIN_ALL: "super_admin:all",
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

// ─── Role Definitions ─────────────────────────────────────────────────────────

export type Role = "user" | "moderator" | "admin" | "super_admin";

const rolePermissions: Record<Role, Permission[]> = {
  user: [
    Permissions.AUTH_LOGIN,
    Permissions.USER_READ_OWN,
    Permissions.USER_UPDATE_OWN,
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_READ_OWN,
    Permissions.PROJECT_UPDATE_OWN,
    Permissions.PROJECT_DELETE_OWN,
    Permissions.NOTIFICATION_READ_OWN,
    Permissions.NOTIFICATION_UPDATE_OWN,
  ],

  moderator: [
    Permissions.AUTH_LOGIN,
    Permissions.USER_READ_OWN,
    Permissions.USER_UPDATE_OWN,
    Permissions.USER_READ_ANY,
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_READ_OWN,
    Permissions.PROJECT_UPDATE_OWN,
    Permissions.PROJECT_DELETE_OWN,
    Permissions.PROJECT_READ_ANY,
    Permissions.NOTIFICATION_READ_OWN,
    Permissions.NOTIFICATION_UPDATE_OWN,
    Permissions.ADMIN_AUDIT_LOGS,
  ],

  admin: [
    Permissions.AUTH_LOGIN,
    Permissions.USER_READ_OWN,
    Permissions.USER_UPDATE_OWN,
    Permissions.USER_READ_ANY,
    Permissions.USER_UPDATE_ANY,
    Permissions.USER_DEACTIVATE,
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_READ_OWN,
    Permissions.PROJECT_UPDATE_OWN,
    Permissions.PROJECT_DELETE_OWN,
    Permissions.PROJECT_READ_ANY,
    Permissions.PROJECT_UPDATE_ANY,
    Permissions.PROJECT_DELETE_ANY,
    Permissions.NOTIFICATION_READ_OWN,
    Permissions.NOTIFICATION_UPDATE_OWN,
    Permissions.ADMIN_DASHBOARD,
    Permissions.ADMIN_USER_MANAGEMENT,
    Permissions.ADMIN_PROJECT_MANAGEMENT,
    Permissions.ADMIN_AUDIT_LOGS,
    Permissions.ADMIN_SYSTEM_STATS,
  ],

  super_admin: Object.values(Permissions) as Permission[],
};

// ─── RBAC Helpers ─────────────────────────────────────────────────────────────

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "super_admin") return true;
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function isRoleAtLeast(role: Role, minimumRole: Role): boolean {
  const hierarchy: Role[] = ["user", "moderator", "admin", "super_admin"];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(minimumRole);
}
