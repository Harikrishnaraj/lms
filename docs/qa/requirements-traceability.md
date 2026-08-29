# QA Requirements Traceability (Task 32)

Maps each roadmap task to what verification evidence actually exists today. "Evidence" is specific and checkable — a migration applied to a real database, a real lint pass, a fixture query that was actually run — not "the code looks right."

Full task-by-task build notes live in the Claude Project doc `roadmap-tasks-15-33.md`; this doc is the audit trail for *how each one was checked*, kept separate so it stays short and current.

## Verification methods used, and their limits

| Method | What it actually proves | What it can't prove |
|---|---|---|
| Migration applied live to Supabase (`xqjodmdvdlfwadidxcgg`) + fixture insert/query/cleanup | The SQL matches the Prisma model, FK/unique constraints fire, the exact query shapes each service uses (joins, filters) return the right rows | Application-layer bugs the query shape wouldn't surface (wrong permission gate, wrong business rule) |
| Fake-Prisma e2e test present in `__tests__/` | The module *has* a test exercising its controller through real guards (JwtAuthGuard, AuthorizationGuard) with an in-memory stub | Whether the test currently **passes** — Vitest itself has not run in either sandbox this session (see below) |
| Real `pnpm install` + `eslint` | The dependency graph resolves, and the code is free of the specific errors ESLint's configured rules catch (unused vars, explicit `any`, etc.) | Type correctness (see next row), runtime behavior |
| Real `tsc --noEmit` | Full type correctness — **only ran successfully for `packages/types`, `packages/validation`, `packages/config`, `packages/ui`** (all clean, 0 errors). `apps/api`, `apps/web`, `database` depend on `@prisma/client`'s generated types, and generating them requires fetching Prisma's engine binaries from `binaries.prisma.sh`, which is blocked by egress policy in every sandbox available this session (confirmed via direct `curl`: 403 Forbidden). This is the single biggest remaining verification gap — see "What still needs to run on your machine" below. |
| Manual code read against the project's own stated invariants (tenant scoping, RBAC, answer-key isolation, etc.) | Whatever a careful read catches | Anything a careful read misses — this is not a substitute for the above |

## Traceability matrix

| Task | Feature | Evidence | Status |
|---|---|---|---|
| 1-12 | Foundation, auth, tenancy, RBAC, org/user/department admin, course management | Built and verified in earlier sessions (see project history) | done |
| 13-14 | Course catalog, enrollment | Migration verified live; e2e tests present | done |
| 15 | Course Player | Migration verified live; e2e tests present | done |
| 16 | Learning Paths | Migration verified live; e2e tests present | done |
| 17 | Assignments | Migration verified live; e2e tests present | done |
| 18-19 | Assessment Engine + Attempts/Results | Migration authored outside this session, **verified live this session** (fixture chain: assessment → questions → attempt, including a rejected duplicate-constraint check); answer-key isolation manually verified; e2e test present; lint clean | done, not yet unit-tested locally |
| 20 | Certificates | Same migration batch as 18-19, verified live (unique `certificate_number`/`verification_token` confirmed to reject duplicates); e2e test present; lint clean | done, not yet unit-tested locally |
| 21-24 | Trainer/Manager/HR/Org-Admin portal completion | Frontend pages exist for all four portals plus a real login/signup/forgot-password/verify/dev-login flow; lint-clean (18 real errors found and fixed this session); **page-by-page functional review not done** | files exist, lint-clean, functionally unreviewed |
| 25 | Notifications | Migration verified live (notification + preference upsert, unread count query); service manually reviewed for tenant scoping — clean; e2e test present | done, not yet unit-tested locally |
| 26 | Search | No schema change; service manually reviewed — every query `organizationId`-scoped, user search gated behind `user:view`; e2e test present; lint clean | done |
| 27 | Learning Analytics | No schema change; service manually reviewed for tenant scoping — clean, including the learner endpoint resolving the caller's own id server-side rather than trusting a client-supplied one; e2e test present; lint clean | done |
| 28 | Audit Logging | **Bug found and fixed this session** (missing migration, see the security review doc); migration now verified live; e2e test present; lint clean | done |
| 29 | AI Foundation | Manually reviewed — deterministic placeholder behind a port interface, no secrets/external calls, every action audit-logged; lint clean | done |
| 30 | Security Review | `docs/security/security-review.md` (this session) | done, DAST scan still pending a running instance |
| 31 | Testing pass | Real `pnpm install` (827 packages resolved cleanly) + real `eslint` run across the whole repo found and fixed 34 real issues (18 backend, 18 frontend); typecheck ran clean for every Prisma-independent package. **The actual test suite (`pnpm -r test`) has not executed** — blocked by the Prisma engine download restriction described above, in both this environment and the bridged shell against your machine. This is the one task not fully closed. | partially done — see below |
| 32 | Product QA | This document | done |
| 33 | Deployment Prep | `docs/deployment/production-runbook.md` | done |

## What still needs to run on your machine

Everything above that says "not yet unit-tested locally" or "blocked by the Prisma engine download restriction" needs one thing: **`pnpm install && pnpm --filter @lms/database exec prisma generate && pnpm -r test`**, run somewhere with normal, unrestricted internet access — your own machine's regular terminal, not through this session's device bridge (which has the same restriction) and not through this session's own cloud sandbox (confirmed via `curl https://binaries.prisma.sh/... ` → 403). Once `prisma generate` succeeds once, `pnpm -r typecheck` and `pnpm -r test` should both be able to run against the real generated types, which closes out Task 31 for real and gives full confidence in Tasks 18-29's actual runtime behavior, not just their schema and static-analysis correctness.

A `pnpm audit` (or `npm audit`) pass is worth running in that same session while you're at it — dependency vulnerability scanning wasn't possible here either, for the same network-access reason.
