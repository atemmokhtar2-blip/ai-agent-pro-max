/**
 * Authorization Middleware
 *
 * Role and permission checks that run after authenticate().
 * Uses the RBAC module — no permissions are hardcoded here.
 */

import type { Request, Response, NextFunction } from "express";
import { hasPermission, isRoleAtLeast, type Permission, type Role } from "../lib/rbac";

/** Require that the authenticated user has a specific permission. */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!hasPermission(user.role as Role, permission)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** Require that the authenticated user's role is at least the given minimum. */
export function requireRole(minimumRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!isRoleAtLeast(user.role as Role, minimumRole)) {
      res.status(403).json({ error: `Role '${minimumRole}' or higher is required` });
      return;
    }
    next();
  };
}
