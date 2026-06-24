/**
 * Auth Module
 *
 * Endpoints: register, login, logout, refresh, forgot-password, reset-password
 */

import { Router } from "express";
import { z } from "zod";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  generateId,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshTokenRaw,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  generatePasswordResetToken,
} from "../lib/auth";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { recordAuditLog } from "../middlewares/audit";
import { eventBus, PlatformEvents } from "../lib/events";

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function issueTokenPair(userId: string, email: string, role: string) {
  const accessToken = generateAccessToken({ sub: userId, email, role: role as never });
  const rawRefresh = generateRefreshTokenRaw();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.insert(refreshTokensTable).values({
    id: generateId(),
    userId,
    tokenHash,
    expiresAt,
    isRevoked: false,
  });

  return { accessToken, refreshToken: rawRefresh };
}

function buildUserResponse(user: { id: string; username: string; email: string; avatarUrl: string | null; role: string; isActive: boolean; lastLogin: Date | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatarUrl,
    role: user.role,
    is_active: user.isActive,
    last_login: user.lastLogin?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

// ─── POST /register ───────────────────────────────────────────────────────────

router.post("/register", validateBody(registerSchema), async (req, res) => {
  const { username, email, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const usernameExists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (usernameExists.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  const [user] = await db
    .insert(usersTable)
    .values({
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: "user",
      isActive: true,
    })
    .returning();

  const { accessToken, refreshToken } = await issueTokenPair(userId, user.email, user.role);

  await recordAuditLog("user.registered", { userId, metadata: { email: user.email } });
  eventBus.dispatch(PlatformEvents.USER_REGISTERED, { userId, email: user.email });

  res.status(201).json({
    user: buildUserResponse(user),
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
  });
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLogin: new Date() })
    .where(eq(usersTable.id, user.id));

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, user.role);

  await recordAuditLog("user.logged_in", { userId: user.id, metadata: { email: user.email } });
  eventBus.dispatch(PlatformEvents.USER_LOGGED_IN, { userId: user.id });

  res.json({
    user: buildUserResponse(user),
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
  });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post("/logout", authenticate, async (req, res) => {
  const userId = req.user!.sub;

  // Revoke all refresh tokens for this user
  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(and(eq(refreshTokensTable.userId, userId), eq(refreshTokensTable.isRevoked, false)));

  await recordAuditLog("user.logged_out", { userId });
  eventBus.dispatch(PlatformEvents.USER_LOGGED_OUT, { userId });

  res.json({ message: "Logged out successfully" });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

router.post("/refresh", validateBody(refreshSchema), async (req, res) => {
  const { refresh_token: rawToken } = req.body as z.infer<typeof refreshSchema>;
  const tokenHash = hashRefreshToken(rawToken);

  const [stored] = await db
    .select()
    .from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.tokenHash, tokenHash), eq(refreshTokensTable.isRevoked, false)))
    .limit(1);

  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, stored.userId))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or deactivated" });
    return;
  }

  // Rotate: revoke old token, issue new pair
  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.id, stored.id));

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, user.role);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
  });
});

// ─── POST /forgot-password ────────────────────────────────────────────────────

router.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body as z.infer<typeof forgotPasswordSchema>;

  // Always return success to prevent email enumeration
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (user) {
    const token = generatePasswordResetToken();
    await recordAuditLog("user.password_reset_requested", {
      userId: user.id,
      metadata: { token_generated: true },
    });
    eventBus.dispatch(PlatformEvents.USER_PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
      token,
    });
  }

  res.json({ message: "If the email exists, a password reset link has been sent" });
});

// ─── POST /reset-password ─────────────────────────────────────────────────────

router.post("/reset-password", validateBody(resetPasswordSchema), async (_req, res) => {
  // Phase 1: token storage/verification not yet implemented (no email provider)
  // Future phases will validate the token against a DB-stored hash
  res.status(501).json({ error: "Password reset requires email configuration. Coming soon." });
});

export default router;
