# E2E suite (Playwright)

Targets the deployed stack by default: Vercel frontend + Railway API.

```bash
pnpm --filter @lms/e2e install:browsers   # once
pnpm --filter @lms/e2e test               # full suite
pnpm --filter @lms/e2e test:access        # only the specs that run today
```

## Current state: 21 passing, 24 skipped

The 24 skips are **not** flaky tests or unwritten stubs. They are blocked on
one thing, and they all unblock together.

### Blocker: no session can be obtained

Every Task 21–24 flow needs an authenticated role. The deployed stack
currently issues no sessions at all — verified live:

| Probe | Result | Meaning |
|---|---|---|
| `POST /auth/login` | `401 Invalid email or password` | Auth0 tenant has no usable users |
| `POST /auth/dev-login` | `404 Not Found` | `DEV_AUTH_BYPASS=false` in production, by design |
| any `/organizations/me/*` | `401` | correct, and untestable further without a token |

**To unblock:** configure the Auth0 tenant (see `apps/api/src/auth/README.md`),
then copy `.env.example` to `.env` and fill in the role credentials. Nothing
else changes — `fixtures/auth.ts` is the single unblock point.

Tenant-isolation specs additionally need a **second organization**
(`E2E_OTHER_ORG_ADMIN_*`). Without two tenants those assertions cannot be
proven, so they skip rather than pass vacuously.

## What the passing 21 actually cover

`specs/access-control.spec.ts` — the unauthenticated boundary, which needs no
Auth0 tenant because "no session" is the state under test. This is the outer
ring of multi-tenant isolation: before asking whether org A can see org B's
data, the deployment must not serve *any* tenant's data anonymously.

- 9 tenant-scoped API endpoints each return `401`, with a body small enough
  and clean enough to prove no data was resolved before the authz check.
- 10 portal routes (Tasks 21–24, 28) each settle into the error state with
  zero data rows, and every `/organizations/me` call they make is rejected.
- `dev-login` is absent in production; `login` does not leak user existence.

## Findings from building this suite

Four things surfaced that are worth acting on independently of the tests.

**1. Manual grading does not exist.** The brief asked for "grade an assessment
attempt". `apps/api/src/assessments` exposes only `POST :id/submit` (learner,
auto-scores against the answer key) and `GET :id/attempts` (trainer,
read-only). There is no trainer-facing mutation to set or override a score,
and `trainer-assessments-client.ts` has no `grade()`. Left as `test.fixme` in
`trainer-portal.spec.ts` rather than written against an endpoint that
does not exist.

**2. Three of the four workspaces are still partly mock-backed**, so "assert
real API responses" is impossible for those parts by construction:

| Page | Real | Mock |
|---|---|---|
| `/admin/manager/team` | manager-client | departments-client, users-client |
| `/admin/manager/assignments` | manager-client | courses-client, users-client, departments-client |
| `/admin/hr/compliance` | analytics-client | departments-client |

Assertions stick to the data that genuinely round-trips. This contradicts the
project's own stated rule that everything from Task 13 onward uses real API
clients.

**3. Learning-path assignment is not in the Manager workspace.** The brief put
it under Task 22, but `manager-client.assignTeamTraining()` is course-only
(`POST /organizations/me/enrollments`). Assigning a *learning path* to a
*department* is `POST /organizations/me/assignments` with
`targetType: LEARNING_PATH`, surfaced on the HR page
`/admin/hr/assignments/new`. Tested there, in `hr-workspace.spec.ts`.

**4. Unauthenticated users get "Something went wrong", not a login redirect.**
Every protected portal route renders the generic error state on a 401.
`api-client.ts` exports `isUnauthorized()` precisely so pages can render a
permission state instead, but these pages do not use it. The audit page is
the worst case: it renders its heading and entity-type filters to an
anonymous visitor before failing. No data leaks, so the tests pass — but the
UX is wrong and it makes a real 401 indistinguishable from an outage.

## Notes on the suite itself

- **`workers: 1`.** The authenticated specs mutate shared tenant state on one
  shared deployment; parallel workers would race. Revisit once each worker
  gets its own seeded tenant.
- **No `data-testid` anywhere in `apps/web`** (verified: zero occurrences), so
  selectors are role/text based. That is Playwright-preferred anyway, but it
  makes the suite sensitive to copy changes. `fixtures/ui.ts` centralises them.
- **`org-admin.spec.ts` selects the org-name input structurally**, because the
  `Organization Name` label has no `htmlFor` and does not wrap its input, so
  `getByLabel` cannot match it. That is an accessibility defect; fixing it in
  `settings/page.tsx` lets the spec use `getByLabel`.
- Specs that mutate state restore it in a `finally` block.
