import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User, TokenPair } from "@workspace/api-client-react";
import {
  getAccessToken,
  forceRefresh,
  storeTokens,
  clearTokens as clearStoredTokens,
  getStoredTokens,
} from "../lib/token-manager";

// ── Has the /me query resolved at least once this session? ────────────────
// We use this to distinguish "tokens exist but /me hasn't responded yet"
// (should show a loader) from "tokens exist and /me confirmed we're logged
// out" (should redirect to /login).  React Query's `isLoading` flag is only
// true while a fetch is in-flight, so there's a one-render gap between
// enabling a query and the fetch actually starting — during which
// `isLoading` is `false` even though we have no user yet.

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: TokenPair) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const refreshingRef = useRef(false);
  // Tracks whether the /me query has resolved at least once (success or
  // error) so we can avoid bouncing the user back to /login during the
  // brief window between storing tokens and the first /me response.
  const meResolvedRef = useRef(false);

  // ── Token state — initialised from localStorage ──────────────────────────
  const [tokens, setTokens] = useState<{ access_token: string; refresh_token: string } | null>(() => {
    const stored = getStoredTokens();
    return stored ? { access_token: stored.access, refresh_token: stored.refresh } : null;
  });

  // ── Proactive token check on mount ───────────────────────────────────────
  // If the stored access token is already expired, try to refresh immediately
  // so we don't waste a round-trip on /api/v1/users/me.
  useEffect(() => {
    if (!tokens) return;
    getAccessToken().then((t) => {
      if (t) {
        // Token is valid or was refreshed — update state if it changed
        if (t !== tokens.access_token) {
          const stored = getStoredTokens();
          if (stored) setTokens({ access_token: stored.access, refresh_token: stored.refresh });
        }
      } else {
        // Both access + refresh tokens failed — log out
        clearStoredTokens();
        meResolvedRef.current = false;
        setTokens(null);
        queryClient.clear();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // ── /api/v1/users/me — the authoritative user check ─────────────────────
  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!tokens?.access_token,
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes — avoids hammering the server
    },
  });

  // Mark that /me has resolved (success or error) so the auth state below
  // can distinguish "still waiting for /me" from "/me said we're logged out".
  useEffect(() => {
    if (user || error) {
      meResolvedRef.current = true;
    }
  }, [user, error]);

  // ── Handle auth errors from useGetMe ─────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    if (refreshingRef.current) return;

    const status = (error as { status?: number }).status;

    if (status === 401) {
      refreshingRef.current = true;
      forceRefresh()
        .then((newToken) => {
          if (newToken) {
            // Refresh worked — invalidate the /me query so it retries
            void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          } else {
            // Refresh failed — full logout
            clearStoredTokens();
            meResolvedRef.current = false;
            setTokens(null);
            queryClient.clear();
          }
        })
        .finally(() => {
          refreshingRef.current = false;
        });
    } else if (status === 403) {
      clearStoredTokens();
      meResolvedRef.current = false;
      setTokens(null);
      queryClient.clear();
    }
  }, [error, queryClient]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = (newTokens: TokenPair) => {
    storeTokens(newTokens.access_token, newTokens.refresh_token);
    meResolvedRef.current = false; // /me needs to re-validate with the new token
    setTokens({ access_token: newTokens.access_token, refresh_token: newTokens.refresh_token });
  };

  const logout = () => {
    clearStoredTokens();
    meResolvedRef.current = false;
    setTokens(null);
    queryClient.clear();
  };

  // When tokens exist but /me hasn't resolved yet (meResolvedRef is false),
  // we treat the state as "loading" so ProtectedRoute shows a spinner
  // instead of bouncing the user back to /login.  This closes the race
  // condition where setTokens() enables useGetMe but isLoading is briefly
  // false before the first fetch starts.
  const hasTokens = !!tokens?.access_token;
  const waitingForMe = hasTokens && !meResolvedRef.current && !user;

  const value: AuthContextType = {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: (isLoading || waitingForMe) && hasTokens,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
