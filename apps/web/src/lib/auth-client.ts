'use client';

/**
 * Real fetch calls against the Auth0-backed auth flow (apps/api/src/auth) —
 * signup, login, logout, forgot-password, and "who am I". See
 * api-client.ts for the token-caching/refresh contract these share, and
 * apps/api/src/auth/README.md for what each endpoint actually does.
 *
 * `organizationId`/`role` on the returned AuthenticatedUser stay null
 * until the Auth0 tenant has the post-login Action described in that
 * README — a real login can succeed while the account still isn't linked
 * to an organization yet. Pages using this client should handle that case
 * rather than assuming a successful login means a usable session.
 */

import { apiFetch, setAccessToken } from './api-client';

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  organizationId: string | null;
  role: string | null;
  permissions: string[];
}

export async function login(email: string, password: string): Promise<AccessTokenResponse> {
  const result = await apiFetch<AccessTokenResponse>('/auth/login', { method: 'POST', body: { email, password } });
  setAccessToken(result.accessToken);
  return result;
}

export function signup(email: string, password: string, name: string): Promise<{ providerUserId: string; message: string }> {
  return apiFetch('/auth/signup', { method: 'POST', body: { email, password, name } });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch('/auth/password/forgot', { method: 'POST', body: { email } });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export function getMe(): Promise<AuthenticatedUser> {
  return apiFetch('/auth/me');
}
