/**
 * GitHub OAuth 2.0 Provider
 *
 * Config priority:
 *   1. Environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
 *   2. Admin DB config (oauthProviderConfigsTable)
 *
 * Redirect URI priority:
 *   1. GITHUB_REDIRECT_URI env var
 *   2. REPLIT_DOMAINS derived URL  (https://<domain>/auth/callback)
 *   3. REPLIT_DEV_DOMAIN derived URL
 *   4. DB-stored redirect_uri
 */

import { db, oauthProviderConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptKey } from "../provider-manager/key-vault";
import type { IOAuthProvider, OAuthProfile } from "./types";

function deriveRedirectUri(): string | null {
  if (process.env.GITHUB_REDIRECT_URI) return process.env.GITHUB_REDIRECT_URI;

  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const domains = replitDomains.split(",").map((d) => d.trim()).filter(Boolean);
    const primary = domains.find((d) => d.endsWith(".replit.app")) ?? domains[0];
    if (primary) return `https://${primary}/auth/callback`;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/auth/callback`;
  }

  return null;
}

async function getConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: "env" | "db";
}> {
  const envClientId     = process.env.GITHUB_CLIENT_ID?.trim();
  const envClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const envRedirectUri  = deriveRedirectUri();

  if (envClientId && envClientSecret) {
    if (!envRedirectUri) {
      throw new Error(
        "GitHub OAuth: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set but the redirect URI " +
        "could not be determined. Set GITHUB_REDIRECT_URI or ensure REPLIT_DEV_DOMAIN is available."
      );
    }
    return { clientId: envClientId, clientSecret: envClientSecret, redirectUri: envRedirectUri, source: "env" };
  }

  // Fall back to DB config
  const [config] = await db
    .select()
    .from(oauthProviderConfigsTable)
    .where(eq(oauthProviderConfigsTable.provider, "github"))
    .limit(1);

  if (!config?.isEnabled || !config.clientId || !config.clientSecretEncrypted || !config.redirectUri) {
    throw new Error("GitHub OAuth is not configured or is disabled");
  }

  const clientSecret = decryptKey(config.clientSecretEncrypted);
  return {
    clientId: config.clientId,
    clientSecret,
    redirectUri: envRedirectUri ?? config.redirectUri,
    source: "db",
  };
}

export class GitHubOAuthProvider implements IOAuthProvider {
  readonly name = "github";

  static isEnvConfigured(): boolean {
    return !!(
      process.env.GITHUB_CLIENT_ID?.trim() &&
      process.env.GITHUB_CLIENT_SECRET?.trim()
    );
  }

  static getRedirectUri(): string | null {
    return deriveRedirectUri();
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    const { clientId, redirectUri } = await getConfig();

    const params = new URLSearchParams({
      client_id:    clientId,
      redirect_uri: redirectUri,
      scope:        "read:user user:email",
      state,
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const { clientId, clientSecret, redirectUri } = await getConfig();

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      throw new Error(`GitHub token exchange failed (${tokenRes.status}): ${body.slice(0, 300)}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };

    if (!tokenData.access_token) {
      throw new Error(
        tokenData.error_description ??
        tokenData.error ??
        "GitHub did not return an access token"
      );
    }

    const token = tokenData.access_token;

    // Fetch user profile
    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:        "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(10_000),
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:        "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(10_000),
      }),
    ]);

    if (!profileRes.ok) throw new Error("Failed to fetch GitHub user profile");

    const profile = (await profileRes.json()) as {
      id:         number;
      login:      string;
      name?:      string;
      email?:     string;
      avatar_url: string;
    };

    // Resolve primary verified email — prefer emails API over profile.email
    let primaryEmail: string | null = null;
    let emailVerified = false;

    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        verified: boolean;
        primary: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      if (primary) {
        primaryEmail  = primary.email;
        emailVerified = primary.verified;
      }
    }

    // Fall back to profile.email if emails API gave nothing
    if (!primaryEmail && profile.email) {
      primaryEmail  = profile.email;
      emailVerified = false; // can't verify without emails endpoint
    }

    if (!primaryEmail) {
      throw new Error(
        "Your GitHub account has no public or verified email address. " +
        "Please add a verified email in your GitHub settings and try again."
      );
    }

    return {
      id:            String(profile.id),
      email:         primaryEmail,
      name:          profile.name ?? profile.login,
      avatarUrl:     profile.avatar_url,
      emailVerified,
    };
  }
}
