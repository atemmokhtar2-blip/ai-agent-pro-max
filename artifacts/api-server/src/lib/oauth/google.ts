/**
 * Google OAuth 2.0 Provider
 *
 * Config priority:
 *   1. Environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
 *   2. Admin DB config (oauthProviderConfigsTable)
 *
 * Redirect URI priority:
 *   1. GOOGLE_REDIRECT_URI env var
 *   2. REPLIT_DEV_DOMAIN derived URL  (https://<domain>/auth/callback)
 *   3. DB-stored redirect_uri
 */

import { db, oauthProviderConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptKey } from "../provider-manager/key-vault";
import type { IOAuthProvider, OAuthProfile } from "./types";

/** Derive the redirect URI from the environment. */
function deriveRedirectUri(): string | null {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/auth/callback`;
  }
  return null;
}

/** Return the effective Google OAuth config, preferring env vars over DB. */
async function getConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: "env" | "db";
}> {
  const envClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const envRedirectUri = deriveRedirectUri();

  // ── 1. Fully env-var configured ─────────────────────────────────────────────
  if (envClientId && envClientSecret) {
    if (!envRedirectUri) {
      throw new Error(
        "Google OAuth: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set but the redirect URI " +
        "could not be determined. Set GOOGLE_REDIRECT_URI or ensure REPLIT_DEV_DOMAIN is available."
      );
    }
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      redirectUri: envRedirectUri,
      source: "env",
    };
  }

  // ── 2. Fall back to DB config ────────────────────────────────────────────────
  const [config] = await db
    .select()
    .from(oauthProviderConfigsTable)
    .where(eq(oauthProviderConfigsTable.provider, "google"))
    .limit(1);

  if (!config?.isEnabled || !config.clientId || !config.clientSecretEncrypted || !config.redirectUri) {
    throw new Error("Google OAuth is not configured or is disabled");
  }

  const clientSecret = decryptKey(config.clientSecretEncrypted);
  return {
    clientId: config.clientId,
    clientSecret,
    redirectUri: envRedirectUri ?? config.redirectUri,
    source: "db",
  };
}

export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = "google";

  /** Synchronously check if this provider is usable (env vars present). */
  static isEnvConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
    );
  }

  /** Return the public redirect URI without needing the secret. */
  static getRedirectUri(): string | null {
    return deriveRedirectUri();
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    const { clientId, redirectUri } = await getConfig();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const { clientId, clientSecret, redirectUri } = await getConfig();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      throw new Error(`Google token exchange failed (${tokenRes.status}): ${body.slice(0, 300)}`);
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!profileRes.ok) {
      throw new Error("Failed to fetch Google user profile");
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email: boolean;
    };

    if (!profile.verified_email) {
      throw new Error("Google account email is not verified");
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      emailVerified: profile.verified_email,
    };
  }
}
