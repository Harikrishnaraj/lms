import { test, expect } from '@playwright/test';
import { login, loginViaUi, requireCredentials } from '../fixtures/auth';
import { waitForDataSettled } from '../fixtures/ui';

/**
 * Task 22 — Manager Workspace.
 *
 * GATED: skips until E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD are set.
 *
 * CAVEAT worth knowing before trusting a green run here: two of these
 * pages are only partly wired to the API.
 *   /admin/manager/team        -> manager-client (real)
 *                               + departments-client, users-client (IN-MEMORY MOCKS)
 *   /admin/manager/assignments -> manager-client (real)
 *                               + courses-client, users-client, departments-client (MOCKS)
 * Assertions below therefore only cover the enrollment data that genuinely
 * round-trips to Railway. The mock-backed pickers are called out inline.
 */
test.describe('Task 22 — Manager Workspace', () => {
  test('Team progress matches GET /organizations/me/enrollments', async ({ page, request, playwright }) => {
    const creds = requireCredentials('MANAGER');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me/enrollments');
    expect(apiRes.status()).toBe(200);
    const payload = (await apiRes.json()) as { items?: unknown[] } | unknown[];
    const enrollments = (Array.isArray(payload) ? payload : (payload.items ?? [])) as {
      id: string;
      status: string;
      course?: { title?: string };
    }[];

    await loginViaUi(page, creds);
    await page.goto('/admin/manager/team');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'My Team' })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    for (const enrollment of enrollments.slice(0, 8)) {
      if (enrollment.course?.title) {
        await expect(
          page.getByText(enrollment.course.title, { exact: false }).first(),
          `Enrollment "${enrollment.course.title}" returned by the API is not rendered`,
        ).toBeVisible();
      }
    }

    await session.api.dispose();
  });

  test('Team reports render real enrollment counts, not client-side guesses', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('MANAGER');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me/enrollments');
    const payload = (await apiRes.json()) as { items?: unknown[]; total?: number } | unknown[];
    const total = Array.isArray(payload) ? payload.length : (payload.total ?? (payload.items ?? []).length);

    await loginViaUi(page, creds);
    await page.goto('/admin/manager/reports');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'Team Reports' })).toBeVisible();
    await expect(page.getByText(String(total), { exact: false }).first()).toBeVisible();

    await session.api.dispose();
  });

  /**
   * The request was "assign a learning path to a department member". Two
   * distinct mechanisms exist and they are NOT interchangeable:
   *
   *   manager-client.assignTeamTraining() -> POST /organizations/me/enrollments
   *       course-only ({ courseId, userId }) — cannot target a learning path.
   *
   *   assignments-client.createAssignment() -> POST /organizations/me/assignments
   *       supports targetType LEARNING_PATH and scope DEPARTMENT | USER,
   *       but is surfaced on the HR page /admin/hr/assignments/new,
   *       not in the Manager workspace.
   *
   * So this asserts the mechanism that actually exists for a manager:
   * assigning a COURSE to a team member. The learning-path case is
   * covered in hr-workspace.spec.ts where the product actually puts it.
   */
  test('Manager assigns a course to a team member and the API persists it', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('MANAGER');
    const session = await login(request, playwright.request, creds);

    const before = await session.api.get('/organizations/me/enrollments');
    const beforePayload = (await before.json()) as { items?: unknown[] } | unknown[];
    const beforeCount = (Array.isArray(beforePayload) ? beforePayload : (beforePayload.items ?? [])).length;

    await loginViaUi(page, creds);
    await page.goto('/admin/manager/assignments');
    await waitForDataSettled(page);

    // NOTE: the course and member pickers on this page are fed by
    // courses-client / users-client, which are in-memory mocks. The
    // POST itself is real, so this asserts the write path end to end.
    const assignRequest = page.waitForResponse(
      (r) => r.url().includes('/organizations/me/enrollments') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );

    await page.getByRole('button', { name: /assign/i }).first().click();
    const response = await assignRequest;

    expect([200, 201], `Assign returned ${response.status()}`).toContain(response.status());

    // Re-read from the API: the UI updating optimistically is not proof.
    const after = await session.api.get('/organizations/me/enrollments');
    const afterPayload = (await after.json()) as { items?: unknown[] } | unknown[];
    const afterCount = (Array.isArray(afterPayload) ? afterPayload : (afterPayload.items ?? [])).length;

    expect(afterCount, 'Enrollment count did not increase after assigning').toBeGreaterThan(beforeCount);

    await session.api.dispose();
  });

  test('Manager cannot reach HR-only or org-admin surfaces', async ({ request, playwright }) => {
    const creds = requireCredentials('MANAGER');
    const session = await login(request, playwright.request, creds);

    // Authorisation is DB-resolved per request, never trusted from the JWT,
    // so a manager token must be refused on admin-scoped writes.
    const res = await session.api.patch('/organizations/me', { data: { name: 'Manager Should Not Rename' } });
    expect([401, 403], `Manager was allowed to PATCH /organizations/me (${res.status()})`).toContain(
      res.status(),
    );

    await session.api.dispose();
  });
});
