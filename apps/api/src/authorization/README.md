# Authorization (RBAC)

Centralized, server-side role-based access control, per TRD §10.2. Five fixed
platform roles: `LEARNER`, `TRAINER`, `MANAGER`, `HR_LD_ADMIN`,
`ORGANIZATION_ADMIN`.

## Data model (`database/prisma/schema.prisma`)

- `Role` — one global row per platform role (not tenant-customizable yet).
- `Permission` — a discrete, granular string (`course:publish`, `user:manage`,
  ...). Global, not tenant-owned.
- `RolePermission` — many-to-many role → permission mapping. The full matrix
  lives in `database/prisma/seed.ts` (`ROLE_PERMISSIONS`) as the single source
  of truth for what each role can do.
- `Membership` — **user-role assignment**, scoped to one organization:
  `(organizationId, userId, roleId)`. `userId` is the identity provider's
  subject (JWT `sub`) — there is still no local `User` profile table, so this
  is the minimal join needed to answer "what can this caller do, in this
  org?" It is also the first real tenant-owned table beyond `Organization`
  itself (see `apps/api/src/tenancy/README.md` for the isolation pattern it
  follows).

## Why authorization is re-derived from the database, not from the JWT

`AuthenticatedUser.role` / `.permissions` (from `apps/api/src/auth/`) come
from custom JWT claims and are informational only — useful for a UI to decide
what to render, for example. **They are never used to make an authorization
decision.** `AuthorizationService.resolve()` looks up the caller's
`Membership` fresh, on every request that needs it.

This matters because an access token can be valid for up to 15 minutes (TRD
§10.1). If authorization were decided from the token, revoking someone's
`ORGANIZATION_ADMIN` role would not take effect until their current token
expired. Re-deriving from the database means a role change is enforced on the
very next request.

## Enforcement

`AuthorizationGuard` is applied globally (`APP_GUARD` in
`AuthorizationModule`), alongside `JwtAuthGuard`. **Module import order in
`AppModule` matters**: `AuthModule` (contributes `JwtAuthGuard`) must be
imported before `AuthorizationModule` (contributes `AuthorizationGuard`) —
Nest runs multiple global guards in the order their modules were registered,
and `AuthorizationGuard` depends on `request.user` already being set.

A route is unrestricted (beyond authentication + tenant context) unless it
declares requirements:

```ts
@Roles(RoleKey.ORGANIZATION_ADMIN, RoleKey.HR_LD_ADMIN)
@Permissions('user:manage')
@Post()
assign(@CurrentTenant() organizationId: string, @Body() dto: AssignMembershipDto) { ... }
```

- `@Roles(...)` — the caller's role (in their own org) must be one of the
  listed keys.
- `@Permissions(...)` — the caller must hold **every** listed permission
  (AND semantics). Compose multiple permission-gated routes, or add an
  application-specific "any of" check inside a service method, if OR
  semantics are ever needed — the guard intentionally keeps to one
  unambiguous rule.
- Both may be combined; both must pass. Neither present → the guard is a
  no-op (any authenticated, tenant-scoped caller may proceed).
- No `Membership` for the caller in their own organization → `403 Forbidden`,
  even if neither decorator is present but the request otherwise reached a
  route requiring one of them.

## Testing

See `src/authorization/__tests__/authorization.guard.test.ts` (allowed role,
denied role, missing permission — unit-level, fake `AuthorizationService`) and
`src/memberships/__tests__/memberships.e2e.test.ts` (the same scenarios over
real HTTP through the full guard chain, plus the cross-tenant case: an admin
of Organization A cannot read or revoke a membership that only exists under
Organization B).
