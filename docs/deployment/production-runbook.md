# Production Deployment Runbook (Task 33)

## Before every deploy — required checks

- [ ] `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` all pass, run somewhere with normal internet access (see `docs/qa/requirements-traceability.md` — this repo's dev shell here can't reach `binaries.prisma.sh` to generate the Prisma client, so this has to run on a real machine or your CI runner, not through this session).
- [ ] `pnpm --filter @lms/database exec prisma migrate deploy` runs clean against the target database, applying every migration under `database/prisma/migrations/` in order. Do **not** use `prisma db push` in production — it can silently drop columns/tables that don't match the schema.
- [ ] `pnpm --filter @lms/database exec prisma migrate status` shows no drift before you deploy application code that depends on the new schema.

## Environment variables — production values

Every one of these needs a real value in production; `infrastructure/.env.example` documents the full set. The ones worth calling out specifically:

- **`DEV_AUTH_BYPASS` must be unset or `false`.** The API itself refuses to boot if this is `true` and `NODE_ENV=production` (`packages/config/src/env.ts`), so a misconfigured prod deploy fails loudly at startup rather than silently exposing the demo-login side door — but don't rely on that as your only safeguard. Confirm this explicitly in whatever secrets/config store production reads from.
- **`NODE_ENV=production`** — required for the above check to fire, and for various framework-level production optimizations (Next.js, NestJS).
- **`CORS_ORIGIN`** must be your real frontend origin(s), comma-separated if more than one — not `http://localhost:3000`.
- **`AUTH0_*` / `AUTH_JWKS_URI` / `AUTH_ISSUER`** — real Auth0 tenant values, not the dev-bypass JWKS endpoint (`/api/v1/auth/dev/jwks`).
- **`DATABASE_URL`** — your production Postgres connection string (Supabase or otherwise). Use a connection-pooled URL (e.g. Supabase's pooler on port 6543) for the API's runtime connection if the platform supports many concurrent serverless/edge invocations; migrations should run against the direct (non-pooled) connection.
- **`REDIS_URL`** — required; `apps/api/src/redis/redis.module.ts` connects eagerly at boot and defaults to `localhost:6379` if unset, which will fail immediately against a real deployment target with no Redis reachable at that address.
- **`STORAGE_PROVIDER`** — must be `s3` (or your chosen provider) in production, never `local`; `local` writes uploaded course content to the API server's own disk, which doesn't persist or scale across instances.
- **`S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`** — required when `STORAGE_PROVIDER=s3`; `validateEnv()` throws at boot if any are missing.

## Hosting platform: Vercel

Vercel is a strong fit for `apps/web` — it's already plain Next.js 15 App Router, so it deploys there with effectively zero configuration (connect the repo, set the root directory to `apps/web`, it picks up `pnpm` from `packageManager` automatically). Preview deployments per PR also line up well with this monorepo's Turborepo setup.

`apps/api` (NestJS) is a different call:

- **It can run on Vercel** as a serverless Node.js function (wrap `main.ts`'s Nest app behind a request handler, similar to how NestJS's own serverless examples work) — but two things in this codebase push against it. `apps/api/src/redis/redis.module.ts` connects to Redis *eagerly, at module boot* rather than lazily; on a serverless platform, every cold start spins up a fresh process and reopens that connection, which can exhaust your Redis provider's connection limit under real traffic far faster than a normal long-running server would. And `notification-queue.ts`'s in-process queue (Task 25) assumes a persistent process to drain jobs from — a serverless function that returns and freezes between invocations isn't a reliable place to run a background worker.
- **Recommended split**: deploy `apps/web` to Vercel, and deploy `apps/api` somewhere built for a long-running Node process — Railway, Render, Fly.io, or a plain container host all work fine with the existing `docker-compose.yml`-shaped service list (Postgres + Redis + the API itself) as a starting point. Point `apps/web`'s API client at that API's URL via an environment variable, and set `CORS_ORIGIN` on the API to the Vercel-assigned (or custom) frontend domain.
- If you'd rather keep everything on one platform, Vercel's own Postgres/KV offerings plus a rework of the Redis connection to lazy-connect and the notification queue to a Vercel-compatible cron/queue primitive would remove the two blockers above — but that's a real refactor, not a config change, and isn't done in this codebase today.

## Deploy order

1. Apply pending migrations (`prisma migrate deploy`) against the production database **before** deploying the new API build — the schema must be ahead of or equal to what the new code expects, never behind.
2. Deploy the API (`apps/api`).
3. Deploy the frontend (`apps/web`), pointed at the now-live API.
4. Smoke-test: hit `GET /api/v1/health`, then a real login flow end to end (not dev-bypass), then one read from each of the newer surfaces (an assessment list, a certificate verification page, a notification inbox) to confirm the Task 18-29 migrations actually landed correctly in prod.

## Rollback

- **Application code**: redeploy the previous build/image. Both `apps/api` and `apps/web` are stateless — no special rollback steps beyond redeploying.
- **Database**: every migration in this repo ships a matching `down.sql`. Prisma's own migration history table doesn't automatically run these on rollback — if a migration needs reverting, apply its `down.sql` manually and remove the corresponding row from Prisma's `_prisma_migrations` tracking table so `migrate status` reflects reality afterward. Prefer forward-fixing over rolling back a migration once real user data may already reference the new tables/columns — a rollback that drops a table with live rows in it is a data-loss event, not a fix.
- Because Certificates, Assessments, and Notifications all reference course/user data via cascading foreign keys, rolling back any one of the Tasks 18-29 migrations after it has real data in it will cascade-delete that data. Treat those as one-way once live traffic exists.

## Known gaps to close before go-live (not blockers for a staging deploy)

- No live DAST security scan has been run against a real running instance (`docs/security/security-review.md`) — do one against staging before the first production deploy.
- No dependency vulnerability audit (`pnpm audit`) has been run — do this alongside the DAST scan.
- The real test suite (`pnpm -r test`) has not executed anywhere yet this session, for the Prisma-engine-network reason noted above — this should be a hard gate in CI before any production deploy, not just a staging nice-to-have.
- `scratch/install-pdfkit/` and `.claude-tmp/` (a temp staging folder this session created and couldn't delete due to file-permission restrictions in the bridged environment) are sitting in the repo root — delete both before your next commit; neither should ship.
