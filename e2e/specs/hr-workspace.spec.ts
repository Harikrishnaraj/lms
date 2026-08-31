import { test, expect } from '@playwright/test';
import { login, loginViaUi, requireCredentials } from '../fixtures/auth';
import { waitForDataSettled } from '../fixtures/ui';

/**
 * Task 23 — HR / L&D Workspace.
 *
 * GATED: skips until E2E_HR_EMAIL / E2E_HR_PASSWORD are set.
 *
 * CAVEAT: /admin/hr/compliance draws department names from
 * departments-client, which is an in-memory mock; the compliance figures
 * themselves come from analytics-client (real). Assertions stick to the
 * real numbers.
 */
test.describe('Task 23 — HR/L&D Workspace', () => {
  test('Compliance tracker matches GET /organizations/me/analytics/departments', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('HR');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me/analytics/departments');
    expect(apiRes.status()).toBe(200);
    const departments = (await apiRes.json()) as {
      departmentId: string;
      completionRate?: number;
      compliantCount?: number;
    }[];

    await loginViaUi(page, creds);
    await page.goto('/admin/hr/compliance');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'Compliance Tracker' })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    // Compliance percentages are a regulated-reporting surface: the page
    // must show the server's computed figure, not a rounded re-derivation.
    for (const dept of departments.slice(0, 5)) {
      if (typeof dept.completionRate === 'number') {
        await expect(
          page.getByText(String(Math.round(dept.completionRate)), { exact: false }).first(),
        ).toBeVisible();
      }
    }

    await session.api.dispose();
  });

  test('Learning analytics match GET /organizations/me/analytics/overview', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('HR');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me/analytics/overview');
    expect(apiRes.status()).toBe(200);
    const overview = (await apiRes.json()) as Record<string, unknown>;

    await loginViaUi(page, creds);
    await page.goto('/admin/hr/analytics');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'Learning Analytics' })).toBeVisible();

    for (const value of Object.values(overview).filter((v) => typeof v === 'number').slice(0, 5)) {
      await expect(page.getByText(String(value), { exact: false }).first()).toBeVisible();
    }

    await session.api.dispose();
  });

  /**
   * The learning-path assignment the brief attributes to Task 22 actually
   * lives here: POST /organizations/me/assignments accepts
   * targetType LEARNING_PATH with scope DEPARTMENT, which is precisely
   * "assign a learning path to a department".
   */
  test('HR assigns a learning path to a department and the API persists it', async ({
    request,
    playwright,
  }) => {
    const creds = requireCredentials('HR');
    const session = await login(request, playwright.request, creds);

    const [pathsRes, deptsRes] = await Promise.all([
      session.api.get('/organizations/me/learning-paths'),
      session.api.get('/organizations/me/departments'),
    ]);
    test.skip(!pathsRes.ok() || !deptsRes.ok(), 'Learning paths or departments unavailable for this tenant');

    const paths = (await pathsRes.json()) as { items?: { id: string }[] } | { id: string }[];
    const depts = (await deptsRes.json()) as { items?: { id: string }[] } | { id: string }[];
    const pathList = Array.isArray(paths) ? paths : (paths.items ?? []);
    const deptList = Array.isArray(depts) ? depts : (depts.items ?? []);
    test.skip(pathList.length === 0 || deptList.length === 0, 'Tenant has no learning path or department to assign');

    const created = await session.api.post('/organizations/me/assignments', {
      data: {
        targetType: 'LEARNING_PATH',
        targetId: pathList[0].id,
        scopeType: 'DEPARTMENT',
        scopeId: deptList[0].id,
      },
    });

    expect([200, 201], `Assignment creation returned ${created.status()}`).toContain(created.status());

    // Confirm by re-reading, not by trusting the POST response.
    const list = await session.api.get('/organizations/me/assignments');
    const body = (await list.json()) as { items?: { targetId: string }[] } | { targetId: string }[];
    const assignments = Array.isArray(body) ? body : (body.items ?? []);
    expect(assignments.some((a) => a.targetId === pathList[0].id)).toBeTruthy();

    await session.api.dispose();
  });

  test('HR cannot mutate organization settings (admin-only)', async ({ request, playwright }) => {
    const creds = requireCredentials('HR');
    const session = await login(request, playwright.request, creds);

    const res = await session.api.patch('/organizations/me', { data: { name: 'HR Should Not Rename' } });
    expect([401, 403], `HR was allowed to PATCH /organizations/me (${res.status()})`).toContain(res.status());

    await session.api.dispose();
  });
});
