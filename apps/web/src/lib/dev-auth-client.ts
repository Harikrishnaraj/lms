'use client';

/**
 * Client for the dev-only "sign in as a seeded demo user" side door
 * (apps/api/src/auth/dev/) — see apps/api/src/auth/README.md ("Local dev
 * without Auth0"). Only reachable when the API has DEV_AUTH_BYPASS=true;
 * every call here 404s otherwise.
 */

import { apiFetch, setAccessToken } from './api-client';

export interface DevUser {
  userId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  role: string | null;
}

export function listDevUsers(): Promise<DevUser[]> {
  return apiFetch('/auth/dev/users');
}

export async function signInAsDevUser(userId: string): Promise<DevUser> {
  const result = await apiFetch<{ accessToken: string; user: DevUser }>('/auth/dev/login', {
    method: 'POST',
    body: { userId },
  });
  setAccessToken(result.accessToken);
  return result.user;
}
