# Enrollments

Task 14. A learner's relationship to one course: who created it (self,
admin, or manager), whether it's mandatory, its due date, and learner
progress status (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` — mark-complete
and video/progress tracking land with the course player in Task 15).

## Three entry points, one model

| Entry point | Route | Who | Scope |
|---|---|---|---|
| Self-enrollment | `POST /organizations/me/enrollments/self` | Any authenticated org member | Only `PUBLIC` + `PUBLISHED` courses (see `Course.visibility` in `database/prisma/schema.prisma`) |
| Admin assignment | `POST /organizations/me/enrollments` | `HR_LD_ADMIN`, `ORGANIZATION_ADMIN` (`enrollment:manage`) | Any user, any `PUBLISHED` course |
| Manager assignment | `POST /organizations/me/enrollments` | `MANAGER` (`enrollment:manage`) | Only users in a department this manager manages (`Department.managerId`) |

Assignment is an upsert: reassigning a due date or the mandatory flag to an
already-enrolled learner updates the existing row rather than conflicting.

## Manager scope

There is no `User.managerId` hierarchy in this schema (see
`architecture_and_schema.md`'s blueprint, which assumed one, versus the
actual Prisma schema, which scopes management at the department level via
`Department.managerId` — the real schema is authoritative). A Manager's
reach is therefore: every user whose `departmentId` is one of the
departments where `Department.managerId` equals the caller's local
`User.id`. `EnrollmentsService.managedDepartmentIds` computes this set and
every Manager-scoped operation (`assign`, `list`, `getById`, `cancel`)
enforces it — see `assertManagerScope` / `assertViewable`.

## Role resolution

`role` and `permissions` are re-derived per request from `AuthorizationService.resolve()`
(the database), never trusted from the JWT — same rule as everywhere else in
this API (see `apps/api/src/authorization/README.md`). The controller
resolves the caller's local `User.id`, role, and permissions once per
request (`resolveCaller`) and passes that as an explicit `EnrollmentCaller`
into the service, rather than the service re-deriving it — keeps the
service testable with plain fakes.

## Ownership vs. staff access

`GET /:id`, `DELETE /:id`, and `GET /mine` are intentionally not gated by
`@Permissions()` — they're reachable by any authenticated org member — and
instead enforce fine-grained ownership/scope checks inside the service
(`assertViewable`), because "can view your own enrollment" and "can view
enrollments you manage" are two different rules that a single declarative
permission can't express. `POST /` and `GET /` (the staff-facing
create/list) *are* gated by `@Permissions('enrollment:manage')`, since
those have no self-service meaning.
