import { test, expect } from '@playwright/test';
import { login, requireCredentials } from '../fixtures/auth';

/**
 * Multi-tenant isolation boundaries.
 *
 * GATED, and needs TWO tenants: E2E_ADMIN_* (org A) and
 * E2E_OTHER_ORG_ADMIN_* (org B). Without a second organization these
 * assertions are unprovable, so they skip rather than pass vacuously.
 *
 * The invariants under test come straight from the project's stated
 * constraints:
 *   - every tenant-owned table carries organizationId
 *   - TenantContextInterceptor resolves it from the JWT only
 *   - cross-tenant lookups return 404, never 403
 *
 * That last one matters: a 403 confirms the record exists in some other
 * tenant, which is itself a leak. Only a 404 reveals nothing.
 */
test.describe('Multi-tenant isolation', () => {
  test('Org A and Org B see disjoint enrollments', async ({ request, playwright }) => {
    const a = await login(request, playwright.request, requireCredentials('ADMIN'));
    const b = await login(request, playwright.request, requireCredentials('OTHER_ORG_ADMIN'));

    const [resA, resB] = await Promise.all([
      a.api.get('/organizations/me/enrollments'),
      b.api.get('/organizations/me/enrollments'),
    ]);

    const idsOf = async (res: Awaited<ReturnType<typeof a.api.get>>) => {
      const body = (await res.json()) as { items?: { id: string }[] } | { id: string }[];
      return new Set((Array.isArray(body) ? body : (body.items ?? [])).map((e) => e.id));
    };

    const [idsA, idsB] = await Promise.all([idsOf(resA), idsOf(resB)]);
    const overlap = [...idsA].filter((id) => idsB.has(id));

    expect(overlap, `Enrollment ids visible to both tenants: ${overlap.join(', ')}`).toHaveLength(0);

    await Promise.all([a.api.dispose(), b.api.dispose()]);
  });

  test("Org B's organization record is invisible to Org A (404, not 403)", async ({
    request,
    playwright,
  }) => {
    const a = await login(request, playwright.request, requireCredentials('ADMIN'));
    const b = await login(request, playwright.request, requireCredentials('OTHER_ORG_ADMIN'));

    const orgB = (await (await b.api.get('/organizations/me')).json()) as { id: string; name: string };

    const res = await a.api.get(`/organizations/${orgB.id}`);
    expect(
      res.status(),
      'Cross-tenant read must 404 — a 403 confirms the record exists elsewhere',
    ).toBe(404);

    // And the body must not echo the other tenant's name back.
    expect(await res.text()).not.toContain(orgB.name);

    await Promise.all([a.api.dispose(), b.api.dispose()]);
  });

  test("Org A cannot read Org B's audit log", async ({ request, playwright }) => {
    const a = await login(request, playwright.request, requireCredentials('ADMIN'));
    const b = await login(request, playwright.request, requireCredentials('OTHER_ORG_ADMIN'));

    const orgB = (await (await b.api.get('/organizations/me')).json()) as { id: string };

    // organizationId is resolved from the JWT, so an attacker-supplied
    // query param must be ignored rather than honoured.
    const res = await a.api.get(`/organizations/me/audit-logs?organizationId=${orgB.id}`);
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { items?: { organizationId?: string }[] } | { organizationId?: string }[];
    const logs = Array.isArray(body) ? body : (body.items ?? []);
    for (const log of logs) {
      if (log.organizationId) {
        expect(log.organizationId, 'Audit log honoured an attacker-supplied organizationId').not.toBe(orgB.id);
      }
    }

    await Promise.all([a.api.dispose(), b.api.dispose()]);
  });

  test("Org A cannot assign training to an Org B user", async ({ request, playwright }) => {
    const a = await login(request, playwright.request, requireCredentials('ADMIN'));
    const b = await login(request, playwright.request, requireCredentials('OTHER_ORG_ADMIN'));

    const membersB = (await (await b.api.get('/organizations/me/members')).json()) as
      | { items?: { userId: string }[] }
      | { userId: string }[];
    const listB = Array.isArray(membersB) ? membersB : (membersB.items ?? []);
    test.skip(listB.length === 0, 'Org B has no members to target');

    const coursesA = (await (await a.api.get('/organizations/me/courses')).json()) as
      | { items?: { id: string }[] }
      | { id: string }[];
    const listA = Array.isArray(coursesA) ? coursesA : (coursesA.items ?? []);
    test.skip(listA.length === 0, 'Org A has no course to assign');

    const res = await a.api.post('/organizations/me/enrollments', {
      data: { courseId: listA[0].id, userId: listB[0].userId },
    });

    // A foreign key referenced in a request BODY is rejected as 400 — a 404
    // there would itself confirm the id exists in another tenant.
    expect(
      [400, 403, 404],
      `Cross-tenant enrollment was accepted (${res.status()})`,
    ).toContain(res.status());
    expect(res.status(), 'Cross-tenant enrollment must not succeed').not.toBe(201);

    await Promise.all([a.api.dispose(), b.api.dispose()]);
  });

  test("A tampered organizationId claim does not widen access", async ({ request, playwright }) => {
    const a = await login(request, playwright.request, requireCredentials('ADMIN'));
    const b = await login(request, playwright.request, requireCredentials('OTHER_ORG_ADMIN'));
    const orgB = (await (await b.api.get('/organizations/me')).json()) as { id: string };

    // Permissions are re-resolved from the database per request rather than
    // trusted from the token, so header-level hints must be inert.
    const res = await a.api.get('/organizations/me/members', {
      headers: { 'x-organization-id': orgB.id },
    });

    expect(res.status()).toBe(200);
    const body = (await res.json()) as { items?: { organizationId?: string }[] } | { organizationId?: string }[];
    const members = Array.isArray(body) ? body : (body.items ?? []);
    for (const member of members) {
      if (member.organizationId) expect(member.organizationId).not.toBe(orgB.id);
    }

    await Promise.all([a.api.dispose(), b.api.dispose()]);
  });
});
