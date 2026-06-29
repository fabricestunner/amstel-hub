'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { api, setAccessToken } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const REFRESH_TOKEN_KEY = 'refreshToken';

export type UserRole = 'customer' | 'admin' | 'outlet' | 'super_admin' | string;

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: UserRole;
  avatarUrl?: string;
  outletId?: string | null;
  points?: number;
  rank?: number;
  region?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/** Persist tokens after login / verify, priming the api-client + localStorage. */
export function persistSession(tokens: AuthTokens) {
  setAccessToken(tokens.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSession() {
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** Map a role to its dashboard home. Accepts the backend's UserRole enum
 * (e.g. SUPER_ADMIN, OUTLET_MANAGER, CUSTOMER) as well as short lowercase forms. */
export function roleHome(role?: UserRole): string {
  switch ((role ?? '').toString().toUpperCase()) {
    case 'SUPER_ADMIN':
    case 'CAMPAIGN_MANAGER':
    case 'REGIONAL_MANAGER':
    case 'ADMIN':
      return '/admin';
    case 'OUTLET_MANAGER':
    case 'OUTLET':
      return '/outlet';
    default:
      return '/customer';
  }
}

/** Fetch the current user. Skip the round-trip entirely when no token is stored
 *  so unauthenticated pages redirect immediately instead of waiting for a 401. */
export function useMe() {
  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('refreshToken');
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<AuthUser>('/users/me'),
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });
}

export interface UseAuthResult {
  user: AuthUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Client-side auth gate. When `redirectTo` is provided, unauthenticated users
 * are pushed there. Optionally restrict to specific roles.
 */
export function useAuth(options?: {
  redirectTo?: string;
  roles?: UserRole[];
}): UseAuthResult {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const redirectTo = options?.redirectTo;
  const roles = options?.roles;

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      if (redirectTo) router.replace(redirectTo);
      return;
    }
    if (roles && user.role && !roles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [isLoading, isError, user, redirectTo, roles, router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
  };
}

/** Logout: revoke server session, clear local state, redirect to /login. */
export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    try {
      await api.post('/auth/logout', {
        refreshToken: getStoredRefreshToken(),
      });
    } catch {
      // best-effort: clear locally regardless
    }
    clearSession();
    qc.clear();
    router.replace('/login');
  };
}
