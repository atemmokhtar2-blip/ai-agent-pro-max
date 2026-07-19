/**
 * Authentication Middleware
 *
 * Verifies JWT access tokens from the Authorization header.
 * Fetches the live role from the DB so role changes (e.g. user → admin)
 * take effect immediately without requiring a new login.
 */

import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyAccessToken, type JwtPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  // ── Fetch live role from DB so role upgrades take effect immediately ─────────
  try {
    const [row] = await db
      .select({ role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (!row) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (!row.isActive) {
      res.status(403).json({ error: "Account is disabled" });
      return;
    }

    // Override role from DB — JWT role may be stale if role was changed after login
    req.user = { ...payload, role: row.role as JwtPayload["role"] };
  } catch {
    // DB lookup failed — fall back to JWT role rather than blocking the request
    req.user = payload;
  }

  next();
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // Silently ignore invalid optional tokens
    }
  }

  next();
}
