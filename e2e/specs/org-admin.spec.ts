import { test, expect, type Page } from '@playwright/test';
import { login, loginViaUi, requireCredentials } from '../fixtures/auth';
import { waitForDataSettled } from '../fixtures/ui';

/** The organization-name field. See the note in the first test for why this is structural. */
const orgNameInput = (page: Page) => page.locator('form input[type="text"]').first();

/**
 * Task 24 — Organization Admin, plus Task 28 — Audit Logging.
 *
 * GATED: skips until E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are set.
 *
 * These are the only specs in the suite that mutate durable tenant state
 * (the organization name), so each one restores what it changed.
 */
test.describe('Task 24 — Organization Admin', () => {
  test('Settings page renders the real organization from GET /organizations/me', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me');
    expect(apiRes.status()).toBe(200);
    const org = (await apiRes.json()) as { id: string; name: string };

    await loginViaUi(page, creds);
    await page.goto('/admin/organization/settings');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();
    // Selected structurally, not by label: the "Organization Name" <label>
    // in apps/web/src/app/admin/organization/settings/page.tsx has no
    // htmlFor and does not wrap its input, so getByLabel cannot match it.
    // That is an accessibility defect in its own right — fix it there and
    // this becomes page.getByLabel('Organization Name').
    await expect(orgNameInput(page), 'Name field was not populated from the API').toHaveValue(org.name);

    await session.api.dispose();
  });

  test('Updating the organization name persists via PATCH /organizations/me', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    const original = (await (await session.api.get('/organizations/me')).json()) as { name: string };
    const updated = `${original.name} [e2e ${Date.now()}]`;

    try {
      await loginViaUi(page, creds);
      await page.goto('/admin/organization/settings');
      await waitForDataSettled(page);

      const patchPromise = page.waitForResponse(
        (r) => r.url().includes('/organizations/me') && r.request().method() === 'PATCH',
        { timeout: 30_000 },
      );

      const nameField = orgNameInput(page);
      await expect(nameField).toHaveValue(original.name);
      await nameField.fill(updated);
      await page.getByRole('button', { name: /save|update/i }).first().click();

      const patchRes = await patchPromise;
      expect(patchRes.status(), `PATCH returned ${patchRes.status()}`).toBe(200);

      // Independent re-read: proves persistence, not just optimistic UI.
      const confirmed = (await (await session.api.get('/organizations/me')).json()) as { name: string };
      expect(confirmed.name).toBe(updated);
    } finally {
      // Always restore, even if an assertion above failed.
      await session.api.patch('/organizations/me', { data: { name: original.name } });
      await session.api.dispose();
    }
  });

  test('Organization update is validated, not blindly accepted', async ({ request, playwright }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    const res = await session.api.patch('/organizations/me', { data: { name: '' } });
    expect(res.status(), 'An empty organization name should be rejected').toBe(400);

    await session.api.dispose();
  });
});

test.describe('Task 28 — Audit Logging', () => {
  test('Audit page renders entries from GET /organizations/me/audit-logs', async ({
    page,
    request,
    playwright,
  }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    const apiRes = await session.api.get('/organizations/me/audit-logs');
    expect(apiRes.status()).toBe(200);
    const body = (await apiRes.json()) as { items?: { entityType: string }[] } | { entityType: string }[];
    const logs = Array.isArray(body) ? body : (body.items ?? []);

    await loginViaUi(page, creds);
    await page.goto('/admin/organization/audit');
    await waitForDataSettled(page);

    await expect(page.getByRole('heading', { name: 'Security Audit Logs' })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    if (logs.length > 0) {
      await expect(page.getByRole('row').first()).toBeVisible();
    }

    await session.api.dispose();
  });

  test('Entity-type filter narrows the query server-side', async ({ page, request, playwright }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    await loginViaUi(page, creds);
    await page.goto('/admin/organization/audit');
    await waitForDataSettled(page);

    // The filter must go back to the API, not filter an already-fetched array:
    // an audit log is paginated, so client-side filtering would silently
    // only search the current page.
    const filtered = page.waitForResponse(
      (r) => r.url().includes('/organizations/me/audit-logs') && r.url().includes('Course'),
      { timeout: 30_000 },
    );

    await page.getByRole('combobox').first().selectOption({ label: 'Course' });
    const res = await filtered;
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { items?: { entityType: string }[] } | { entityType: string }[];
    const logs = Array.isArray(body) ? body : (body.items ?? []);
    for (const log of logs.slice(0, 20)) {
      expect(log.entityType).toBe('Course');
    }

    await session.api.dispose();
  });

  test('An admin action writes a durable audit entry', async ({ request, playwright }) => {
    const creds = requireCredentials('ADMIN');
    const session = await login(request, playwright.request, creds);

    const original = (await (await session.api.get('/organizations/me')).json()) as { name: string };
    const marker = `${original.name} [audit ${Date.now()}]`;

    try {
      await session.api.patch('/organizations/me', { data: { name: marker } });

      // AuditService.record() swallows its own insert errors, so a missing
      // entry fails silently in production. This is the check that a
      // regression there would otherwise never surface.
      await expect
        .poll(
          async () => {
            const res = await session.api.get('/organizations/me/audit-logs?entityType=Organization');
            const body = (await res.json()) as { items?: unknown[] } | unknown[];
            const logs = Array.isArray(body) ? body : (body.items ?? []);
            return logs.length;
          },
          { timeout: 20_000, message: 'No Organization audit entry appeared after an admin update' },
        )
        .toBeGreaterThan(0);
    } finally {
      await session.api.patch('/organizations/me', { data: { name: original.name } });
      await session.api.dispose();
    }
  });
});
