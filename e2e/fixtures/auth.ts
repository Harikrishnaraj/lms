import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_BASE_URL, WEB_BASE_URL } from '../playwright.config';

/**
 * THE SINGLE UNBLOCK POINT FOR EVERY AUTHENTICATED SPEC.
 *
 * Nothing in Tasks 21-24 can be exercised without a real session, and the
 * deployed stack currently issues none:
 *   - POST /auth/login  -> 401 (Auth0 tenant has no usable users yet)
 *   - POST /auth/dev-login -> 404 (DEV_AUTH_BYPASS=false in production, by design)
 *
 * Once Auth0 is configured, set these in e2e/.env (see .env.example) and
 * every gated spec starts running with no other change:
 *
 *   E2E_TRAINER_EMAIL / E2E_TRAINER_PASSWORD
 *   E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD
 *   E2E_HR_EMAIL      / E2E_HR_PASSWORD
 *   E2E_ADMIN_EMAIL   / E2E_ADMIN_PASSWORD
 *   E2E_OTHER_ORG_ADMIN_EMAIL / E2E_OTHER_ORG_ADMIN_PASSWORD  (tenant isolation)
 */
export type Role = 'TRAINER' | 'MANAGER' | 'HR' | 'ADMIN' | 'OTHER_ORG_ADMIN';

export interface Credentials {
  email: string;
  password: string;
}

export function credentialsFor(role: Role): Credentials | null {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  return email && password ? { email, password } : null;
}

/**
 * Skips the current test (rather than failing it) when a role has no
 * credentials configured. A skip is the honest signal here: the behaviour
 * is unverified, not broken.
 */
export function requireCredentials(role: Role): Credentials {
  const creds = credentialsFor(role);
  base.skip(
    !creds,
    `No credentials for ${role}. Set E2E_${role}_EMAIL / E2E_${role}_PASSWORD — see e2e/README.md.`,
  );
  return creds as Credentials;
}

export interface Session {
  accessToken: string;
  /** Pre-authenticated API context carrying the same bearer token the UI uses. */
  api: APIRequestContext;
}

/**
 * Logs in against the real API and returns both the access token and an
 * API context bound to it. The UI stores its session as an HttpOnly
 * cookie and exchanges it via POST /auth/refresh, so the browser gets the
 * cookie and the spec gets the token — the two must agree, which is
 * exactly what lets a spec assert the rendered DOM against the real
 * response body.
 */
export async function login(
  request: APIRequestContext,
  playwright: typeof import('@playwright/test').request,
  creds: Credentials,
): Promise<Session> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });

  expect(
    res.ok(),
    `Login failed for ${creds.email} (HTTP ${res.status()}). ` +
      'If this is a 401 the Auth0 tenant is still not configured; see e2e/README.md.',
  ).toBeTruthy();

  const body = (await res.json()) as { accessToken?: string };
  expect(body.accessToken, 'POST /auth/login returned no accessToken').toBeTruthy();

  const api = await playwright.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${body.accessToken}` },
  });

  return { accessToken: body.accessToken as string, api };
}

/**
 * Drives the real login form so the browser ends up holding the HttpOnly
 * session cookie. Deliberately not a cookie injection: the login page is
 * itself part of what Tasks 21-24 depend on, and faking the cookie would
 * skip the one step most likely to regress.
 */
export async function loginViaUi(page: Page, creds: Credentials): Promise<void> {
  await page.goto(`${WEB_BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // The portal shell only renders once the session resolves.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

export const test = base;
export { expect };
