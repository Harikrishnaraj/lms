# Security Review (Task 30)

**Method.** No live app could be started in the environment this review ran in (no reachable Postgres/Redis, and the sandboxed shell used to browse this repo cannot fetch Prisma's engine binaries or run `pnpm`), so this is a **static/manual code review plus live-schema verification** against a real Supabase Postgres instance — not a DAST scan. Once the app can actually run (see `docs/deployment/production-runbook.md`), a HawkScan (or equivalent) pass against a running instance is still recommended before go-live.

Scope: everything added or touched across Tasks 13-29 — the whole API surface, the Prisma schema/migrations, and the new auth flow (`apps/api/src/auth/dev/`). Tasks 1-12's security posture was reviewed as part of their own build (RBAC, tenancy, Auth0 integration) and isn't re-litigated here except where new code touches it.

## Findings

### 1. `AuditLog` had no migration — FIXED
The `AuditLog` Prisma model (Task 28) existed in `schema.prisma` with no corresponding migration anywhere in `database/prisma/migrations/`. `AuditService.record()` swallows its own insert errors by design ("audit recording should not throw in critical user paths"), so this would have failed **silently and permanently** — every audit-log write across the app would have no-opped forever, with no error anywhere except the one read path (`AuditService.list()`, the org audit-log screen), which does not catch and would have thrown a 500. Authored `20260829170000_add_audit_logs/migration.sql` (+ `down.sql`) to match the model, applied it live to Supabase, and verified the exact write/read shapes `AuditService` uses. Fixed.

### 2. `DEV_AUTH_BYPASS` — reviewed, correctly guarded, flagged as a deployment-gate item
The "sign in as a seeded demo user" side door (`apps/api/src/auth/dev/`) is well-built: every method 404s (not 403s) when `DEV_AUTH_BYPASS` isn't `true` so the endpoints don't reveal they exist; `packages/config/src/env.ts` throws at boot if `DEV_AUTH_BYPASS=true` and `NODE_ENV=production`; tokens are minted with the same claim shape a real Auth0 token has, so there's no separate trust path for `JwtStrategy` to get wrong. No bug found. This is not a code fix, it's a **process control**: the boot-time check only helps if `NODE_ENV` is reliably `production` in prod, and `DEV_AUTH_BYPASS` must never appear in a real environment's `.env`. Carried into the deployment runbook's pre-launch checklist.

### 3. Assessment answer-key isolation — verified, no leak
`LearnerAssessmentsController` is a separate controller from the authoring one specifically so `correctIndex` (the answer key) can never leak through a shared route/serializer. Confirmed `AssessmentsService.getForLearner()` / `toLearnerQuestion()` project the field away before it reaches the learner, and `correctIndex` is used server-side only, inside `submit()`'s scoring logic (`assessments.service.ts`). No finding.

### 4. Tenant isolation — spot-checked across the highest-risk new modules, all correctly scoped
Every query in `AnalyticsService`, `SearchService`, `AuditService`, `NotificationsService`, and `CertificatesService` filters by `organizationId` at the top level (nested Prisma `include`s traverse real FK relations off an already-scoped parent, so they don't reopen the tenant boundary). `AnalyticsController.getLearnerAnalytics` resolves the caller's own local user id server-side (`findByExternalId`) rather than accepting a client-supplied user id — a learner cannot query another learner's metrics by guessing an id. No finding. (Not exhaustively re-verified for Tasks 21-24's controllers — see `docs/qa/requirements-traceability.md`.)

### 5. AI Foundation (Task 29) — no secrets, no external calls
`StandardAiProvider` is a fully deterministic, in-process placeholder (keyword-overlap scoring, templated outline generation, word-frequency tagging) behind an `AiPort` interface. No API keys, no `fetch`/`axios` calls, nothing to leak. Every AI action is audit-logged. No finding — but this also means Task 29 has not actually integrated a real LLM provider; that's a product decision for later, not a security gap today.

### 6. Lint-surfaced code-quality issues — 34 fixed, 2 flagged rather than blindly fixed
Running real ESLint (see `docs/qa/requirements-traceability.md` for how) surfaced 18 backend and 18 frontend errors — unused imports/variables and a handful of `any` typings, entirely in code from Tasks 18-29. All but two were fixed with real types or dead-code removal, verified by re-running ESLint to a clean pass. The two left as `any` (`apps/api/src/player/player.service.ts`, the `ci.assessment` field off a dynamic Prisma `include`) were **not** blindly cast away, because this environment cannot run a real `prisma generate` + `tsc` to confirm the precise inferred type — removing the cast without being able to verify it compiles would risk trading a lint warning for a real build break. Left as a scoped, justified `eslint-disable-next-line` with a comment to revisit once a real typecheck is possible. One unrelated finding while fixing the frontend batch: `apps/web/src/app/admin/manager/team/[userId]/page.tsx` computed a `filteredEnrolls` value that was never used (dead code, not a bug — the actually-used `enrolls.items` is already scoped server-side); removed.

### 7. `next lint` config gap — pre-existing, not from this work
`apps/web`'s ESLint run warns "The Next.js plugin was not detected" and errors on `jsx-a11y/media-has-caption` in `apps/web/src/app/learner/courses/[id]/page.tsx` (a rule referenced in config but not resolvable — the plugin isn't wired into the flat config). This predates Tasks 18-29 (the file is from Task 15) and is a lint-config gap, not a runtime or security issue. Left as-is rather than restructuring `eslint.config.mjs` blind, since a config change here can't be verified end-to-end without a full `pnpm -r lint` re-run on a real machine.

## Not done in this pass

- **No live DAST scan.** Needs a running instance — see the runbook.
- **No dependency vulnerability scan** (`pnpm audit` / `npm audit`). `pnpm install` succeeded cleanly in a network-enabled sandbox this session, but engine binaries were the network-blocked resource, not the package registry — an audit pass is a quick follow-up once the app is buildable end-to-end.
- **Tasks 21-24 frontend controllers/pages** were lint-clean-verified but not individually re-audited for tenant/permission scoping the way Analytics/Search/Audit/Notifications were — they call the same already-reviewed backend services, so the risk is lower, but it's not the same level of scrutiny.
