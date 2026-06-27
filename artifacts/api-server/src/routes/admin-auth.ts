/**
 * Admin — OAuth Provider Configuration & Status
 *
 * GET  /providers            — list all providers with status (env + db)
 * GET  /providers/:provider  — single provider status
 * PUT  /providers/:provider  — upsert DB override (when not using env vars)
 * POST /providers/:provider/test — live reachability test
 */

import { Router } from "express";
import { z } from "zod";
import { db, oauthProviderConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validateBody } from "../middlewares/validate";
import { encryptKey, decryptKey } from "../lib/provider-manager/key-vault";
import { generateId } from "../lib/auth";
import { oauthRegistry } from "../lib/oauth/registry";
import { GoogleOAuthProvider } from "../lib/oauth/google";

const router = Router();
router.use(authenticate, requireRole("admin"));

const SUPPORTED_PROVIDERS = ["google"] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a provider status object.
 * env_configured = true when the provider is fully usable via env vars.
 * db_configured  = true when there is a valid manual DB row.
 * is_active      = either env OR db is ready.
 * Secrets are NEVER included in the response.
 */
function buildGoogleStatus(
  dbRow: typeof oauthProviderConfigsTable.$inferSelect | undefined
): object {
  const envConfigured = GoogleOAuthProvider.isEnvConfigured();
  const redirectUri = GoogleOAuthProvider.getRedirectUri();
  const dbConfigured = !!(
    dbRow?.isEnabled &&
    dbRow.clientId &&
    dbRow.clientSecretEncrypted &&
    dbRow.redirectUri
  );

  return {
    provider: "google",
    env_configured: envConfigured,
    db_configured: dbConfigured,
    is_active: envConfigured || dbConfigured,
    redirect_uri: redirectUri ?? dbRow?.redirectUri ?? null,
    // Only expose client_id when it comes from DB (env value stays hidden)
    client_id: envConfigured ? null : (dbRow?.clientId ?? null),
    has_client_secret: envConfigured ? true : !!dbRow?.clientSecretEncrypted,
    db_is_enabled: dbRow?.isEnabled ?? false,
    updated_at: dbRow?.updatedAt.toISOString() ?? null,
  };
}

// ── GET /providers ───────────────────────────────────────────────────────────

router.get("/providers", async (_req, res) => {
  const rows = await db.select().from(oauthProviderConfigsTable);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const result = SUPPORTED_PROVIDERS.map((p) => {
    if (p === "google") return buildGoogleStatus(byProvider.get("google"));
    return { provider: p, env_configured: false, db_configured: false, is_active: false };
  });

  res.json({ providers: result });
});

// ── GET /providers/:provider ─────────────────────────────────────────────────

router.get("/providers/:provider", async (req, res) => {
  const { provider } = req.params as { provider: string };

  if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  const [row] = await db
    .select()
    .from(oauthProviderConfigsTable)
    .where(eq(oauthProviderConfigsTable.provider, provider))
    .limit(1);

  if (provider === "google") {
    res.json(buildGoogleStatus(row));
    return;
  }

  res.json({ provider, env_configured: false, db_configured: false, is_active: false });
});

// ── PUT /providers/:provider ─────────────────────────────────────────────────
// Only useful when env vars are NOT set (provides a DB-level override).

const upsertProviderSchema = z.object({
  client_id: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),
  redirect_uri: z.string().url().optional(),
  is_enabled: z.boolean().optional(),
});

router.put(
  "/providers/:provider",
  validateBody(upsertProviderSchema),
  async (req, res) => {
    const { provider } = req.params as { provider: string };
    const data = req.body as z.infer<typeof upsertProviderSchema>;

    if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    const [existing] = await db
      .select()
      .from(oauthProviderConfigsTable)
      .where(eq(oauthProviderConfigsTable.provider, provider))
      .limit(1);

    const secretEncrypted =
      data.client_secret
        ? encryptKey(data.client_secret)
        : existing?.clientSecretEncrypted ?? null;

    if (existing) {
      const [updated] = await db
        .update(oauthProviderConfigsTable)
        .set({
          clientId: data.client_id ?? existing.clientId,
          clientSecretEncrypted: secretEncrypted,
          redirectUri: data.redirect_uri ?? existing.redirectUri,
          isEnabled: data.is_enabled ?? existing.isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(oauthProviderConfigsTable.provider, provider))
        .returning();
      const row = updated!;
      res.json({
        ...(provider === "google"
          ? buildGoogleStatus(row)
          : { provider, env_configured: false, db_configured: true, is_active: true }),
        message: "Configuration saved",
      });
    } else {
      const [created] = await db
        .insert(oauthProviderConfigsTable)
        .values({
          id: generateId(),
          provider,
          clientId: data.client_id ?? null,
          clientSecretEncrypted: secretEncrypted,
          redirectUri: data.redirect_uri ?? null,
          isEnabled: data.is_enabled ?? false,
        })
        .returning();
      const row = created!;
      res.status(201).json({
        ...(provider === "google"
          ? buildGoogleStatus(row)
          : { provider, env_configured: false, db_configured: true, is_active: true }),
        message: "Configuration saved",
      });
    }
  }
);

// ── POST /providers/:provider/test ───────────────────────────────────────────

router.post("/providers/:provider/test", async (req, res) => {
  const { provider } = req.params as { provider: string };

  if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  if (provider === "google") {
    // Check that credentials exist (env or DB)
    const envConfigured = GoogleOAuthProvider.isEnvConfigured();
    if (!envConfigured) {
      const [row] = await db
        .select()
        .from(oauthProviderConfigsTable)
        .where(eq(oauthProviderConfigsTable.provider, "google"))
        .limit(1);

      if (!row?.clientId || !row.clientSecretEncrypted) {
        res.status(400).json({
          ok: false,
          message:
            "Google is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        });
        return;
      }

      // Validate DB client_id format
      const googlePattern = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
      if (!googlePattern.test(row.clientId)) {
        res.json({
          ok: false,
          message:
            "DB client ID format looks invalid. Expected: <numbers>-<chars>.apps.googleusercontent.com",
        });
        return;
      }
    }

    // Live reachability check — just confirm Google OIDC discovery is up
    try {
      const start = Date.now();
      const discRes = await fetch(
        "https://accounts.google.com/.well-known/openid-configuration",
        { signal: AbortSignal.timeout(10_000) }
      );

      if (!discRes.ok) {
        res.json({
          ok: false,
          message: `Cannot reach Google OAuth servers (HTTP ${discRes.status})`,
        });
        return;
      }

      const latencyMs = Date.now() - start;
      const source = envConfigured ? "environment variables" : "database";

      res.json({
        ok: true,
        message: `Google OAuth reachable in ${latencyMs}ms. Credentials loaded from ${source}.`,
        latency_ms: latencyMs,
        source,
      });
    } catch (err) {
      res.json({ ok: false, message: (err as Error).message });
    }
    return;
  }

  res.json({ ok: false, message: `Test not implemented for provider: ${provider}` });
});

export default router;
