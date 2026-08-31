import { test, expect } from '@playwright/test';
import { API_BASE_URL } from '../playwright.config';
import { ERROR_STATE_TEXT, waitForDataSettled } from '../fixtures/ui';

/**
 * The unauthenticated boundary. This is the one part of the requested
 * coverage that can run today: it needs no Auth0 tenant, because "no
 * session" is exactly the state under test.
 *
 * It is also the outer ring of multi-tenant isolation — before asking
 * whether org A can see org B's data, the deployment must not serve
 * ANY tenant's data to an anonymous visitor.
 */

/** Every portal route behind an authenticated shell, per Tasks 21-24. */
const PROTECTED_ROUTES = [
  // Task 21 — Trainer Portal
  { path: '/trainer/submissions', heading: 'Submissions', task: 21 },
  { path: '/trainer/analytics', heading: 'Course Analytics', task: 21 },
  { path: '/trainer/assessments', heading: 'Assessments', task: 21 },
  // Task 22 — Manager Workspace
  { path: '/admin/manager/team', heading: 'My Team', task: 22 },
  { path: '/admin/manager/reports', heading: 'Team Reports', task: 22 },
  { path: '/admin/manager/assignments', heading: null, task: 22 },
  // Task 23 — HR/L&D Workspace
  { path: '/admin/hr/compliance', heading: 'Compliance Tracker', task: 23 },
  { path: '/admin/hr/analytics', heading: 'Learning Analytics', task: 23 },
  // Task 24 — Org Admin (+ Task 28 audit)
  { path: '/admin/organization/settings', heading: 'Organization Settings', task: 24 },
  { path: '/admin/organization/audit', heading: 'Security Audit Logs', task: 28 },
] as const;

/** Tenant-scoped API endpoints backing those pages (real paths, from apps/web/src/lib/*-client.ts). */
const PROTECTED_ENDPOINTS = [
  '/organizations/me',
  '/organizations/me/members',
  '/organizations/me/users',
  '/organizations/me/enrollments',
  '/organizations/me/assessments',
  '/organizations/me/audit-logs',
  '/organizations/me/analytics/overview',
  '/organizations/me/analytics/departments',
  '/organizations/me/analytics/learner',
] as const;

test.describe('API rejects every tenant-scoped endpoint without a session', () => {
  for (const endpoint of PROTECTED_ENDPOINTS) {
    test(`GET ${endpoint} -> 401`, async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}${endpoint}`);

      expect(res.status(), `${endpoint} must reject anonymous callers`).toBe(401);

      // A 401 body must not carry tenant data. Guards against a handler
      // that resolves data first and only then checks authorisation.
      const text = await res.text();
      expect(text.length, `${endpoint} returned a suspiciously large 401 body`).toBeLessThan(500);
      expect(text).not.toMatch(/organizationId|firstName|"email"/i);
    });
  }
});

test.describe('Protected portal routes leak no tenant data to anonymous visitors', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`Task ${route.task}: ${route.path} renders no data`, async ({ page }) => {
      const apiCalls: { url: string; status: number }[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/organizations/me')) {
          apiCalls.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto(route.path);
      await waitForDataSettled(page);

      // The page must resolve to the error state, never to populated data.
      await expect(
        page.getByText(ERROR_STATE_TEXT),
        `${route.path} must not render data without a session`,
      ).toBeVisible();

      // Every tenant-scoped call the page made must have been rejected.
      for (const call of apiCalls) {
        expect(
          [401, 403],
          `${call.url} returned ${call.status} to an anonymous visitor`,
        ).toContain(call.status);
      }

      // No table of records should have rendered.
      expect(await page.getByRole('row').count(), `${route.path} rendered data rows`).toBe(0);
    });
  }
});

test.describe('Session endpoints behave as configured', () => {
  test('POST /auth/dev-login is absent in production (DEV_AUTH_BYPASS=false)', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/auth/dev-login`, {
      data: { email: 'anyone@example.com' },
    });

    // 404, not 403: the endpoint must not even advertise its existence.
    // packages/config/src/env.ts refuses to boot with the bypass enabled
    // under NODE_ENV=production, so a 200 here is a deployment incident.
    expect(
      res.status(),
      'dev-login is reachable in production — DEV_AUTH_BYPASS may be enabled',
    ).toBe(404);
  });

  test('POST /auth/login rejects unknown credentials without disclosing which field failed', async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email: `no-such-user-${Date.now()}@example.com`, password: 'NotARealPassword1!' },
    });

    expect(res.status()).toBe(401);
    const body = await res.text();
    // User enumeration guard: the message must be identical whether the
    // account exists or not.
    expect(body).toMatch(/invalid email or password/i);
    expect(body).not.toMatch(/user not found|no such user|unknown email/i);
  });
});
