/**
 * OAuth Provider Registry
 *
 * Extensible registry for OAuth providers. New providers register themselves
 * here — no other backend files need to change.
 */

import type { IOAuthProvider } from "./types";
import { GoogleOAuthProvider } from "./google";
import { GitHubOAuthProvider } from "./github";

class OAuthProviderRegistry {
  private providers = new Map<string, IOAuthProvider>();

  register(provider: IOAuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): IOAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`OAuth provider '${name}' is not registered`);
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const oauthRegistry = new OAuthProviderRegistry();

oauthRegistry.register(new GoogleOAuthProvider());
oauthRegistry.register(new GitHubOAuthProvider());
