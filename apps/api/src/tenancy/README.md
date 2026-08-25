# Tenancy

Server-side enforcement of tenant isolation (TRD §9.2). This module resolves
*which* organization a request belongs to; `organizations/` is the first — and
so far only — resource that enforces isolation using it.

## How organization identity is resolved

`organizationId` is never accepted from a query param, path param, or request
body (TRD's "Data Isolation Violation Rule"). It comes from exactly one place:
the `organizationId` claim on the caller's verified JWT (`AuthenticatedUser`,
set by `JwtAuthGuard` — see `apps/api/src/auth/`).

`TenantContextInterceptor` is applied globally (`APP_INTERCEPTOR` in
`TenancyModule`, imported once in `AppModule`). For every non-`@Public()`
route it:

1. Reads `request.user.organizationId`.
2. Throws `ForbiddenException` if it is missing — an authenticated request
   with no resolvable organization is treated as invalid, not as "global"
   access. There is currently no super-admin/cross-tenant bypass.
3. Runs the rest of the request inside `TenantContextStorage` (an
   `AsyncLocalStorage`), so the current organization id is available deep in
   the call stack — a repository or query builder several layers below a
   controller can call `tenantContextStorage.getOrganizationId()` without it
   being threaded through every function signature.

`@CurrentTenant()` is the decorator controllers use to get the same value
directly as a parameter.

## The rule every future tenant-owned module must follow

> Every tenant-owned resource must be associated with an organization, and
> every query against it must be scoped to the caller's organization —
> resolved server-side, never from client input.

Concretely, when a new Prisma model owns tenant data:

1. Add `organizationId String` (mapped to `organization_id`) with a
   `@relation` to `Organization`, plus `@@index([organizationId, ...])` for
   the columns you'll filter/sort by.
2. Every `findMany` / `findUnique` / `update` / `delete` against it **must**
   include `organizationId: tenantContextStorage.getOrganizationId()` (or the
   `@CurrentTenant()` value passed down from the controller) in its `where`.
   Never trust an `organizationId` supplied by the client, even if it looks
   like it matches — always take it from context.
3. When looking up a single row by id for a tenant-scoped resource, prefer
   `findFirst({ where: { id, organizationId } })` over `findUnique({ where:
   { id } })` followed by a manual comparison — it fails closed by
   construction instead of relying on someone remembering the check.
4. Return `404 Not Found` for a cross-tenant id, never `403 Forbidden`. This
   is deliberate: a 403 confirms the resource exists in another tenant, which
   is itself an information leak. See `organizations.service.ts` for the
   pattern (`findByIdScoped`).

## Why this was verified before any business module

Tenant isolation is the single control every other feature depends on for
data safety in a shared-database multi-tenant system. Getting it right once,
here, and testing it explicitly (see
`src/organizations/__tests__/tenant-isolation.e2e.test.ts` — "a user from
Organization A cannot access Organization B data") is cheaper and safer than
re-deriving it per module later.
