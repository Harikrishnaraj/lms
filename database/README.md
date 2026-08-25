# @lms/database

PostgreSQL database foundation for the LMS monorepo, built on Prisma. This package owns
the schema, migrations, seed data, and the shared Prisma client used by `apps/api`.

Only the organization (tenant root) is modeled so far. The full LMS schema (users,
courses, enrollments, etc.) is implemented in a later phase.

## Connection

`src/client.ts` exports a singleton `PrismaClient` (`prisma`) reused across hot reloads
in development, plus `checkDatabaseConnection()` for health checks. `DATABASE_URL` is
read from the environment; see `packages/config/src/env.ts` for the validated schema.

```ts
import { prisma, checkDatabaseConnection } from '@lms/database';
```

## Development database

`infrastructure/docker-compose.yml` runs Postgres 16 and creates two databases on
startup via `infrastructure/postgres/init-test-db.sh`:

- `lms_dev` — used by `DATABASE_URL`
- `lms_test` — used by `TEST_DATABASE_URL`

```bash
docker compose -f infrastructure/docker-compose.yml up -d
cp infrastructure/.env.example .env   # then edit as needed
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed demo data
```

## Test database

Tests do not depend on Docker being available. `tests/setup/embedded-db.ts` boots a
real, disposable PostgreSQL 16 instance (via `embedded-postgres`, a WASM-free
subprocess binary — no system install, no admin rights) on port `55432`, applies all
migrations with `prisma migrate deploy`, and tears the instance down after the run.
This is wired in as vitest's `globalSetup` (`tests/global-setup.ts`), and the resolved
connection string is passed to test files via vitest's `provide`/`inject` context.

```bash
pnpm --filter @lms/tests test
```

See `tests/database/connection.test.ts` for the connection and CRUD smoke tests.

## Migration system

Migrations are managed by Prisma Migrate and committed under `prisma/migrations/`.

```bash
pnpm db:migrate        # prisma migrate dev — create + apply a migration (dev)
pnpm --filter @lms/database exec prisma migrate deploy   # apply only, no diffing (CI/prod)
pnpm --filter @lms/database exec prisma migrate status   # check drift
```

`prisma migrate dev` requires a reachable database with `CREATEDB` privileges (it
manages a shadow database automatically to compute the diff).

## Rollback strategy

Prisma Migrate does not execute down-migrations automatically — it is roll-forward by
design. Two rollback paths are supported, in order of preference:

1. **Corrective migration (production-safe, default).** Never revert applied
   migrations directly. Instead, create a new migration that undoes the unwanted
   change (`pnpm db:migrate`) and deploy it normally. This preserves the migration
   history and is safe under concurrent access.

2. **`prisma migrate reset` (local development only).** Drops the target database,
   reapplies every migration from scratch, then reseeds. This is destructive and
   irreversible, and Prisma's CLI itself refuses to run it for an AI agent without
   explicit human consent when it detects one is invoking the command — by design,
   never run this against a shared or production database.

   ```bash
   pnpm --filter @lms/database exec prisma migrate reset
   ```

Each migration also ships a manually-reviewable `down.sql` alongside `migration.sql`,
generated with:

```bash
pnpm --filter @lms/database exec prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma --to-empty --script
```

`down.sql` is documentation of the exact inverse DDL — Prisma does not apply it
automatically. For `20260825083713_init_organization`, this was generated and
verified: it drops the `organizations` table and the `OrganizationStatus` enum.

## Seed system

`prisma/seed.ts` upserts a single demo organization (`demo-org`) and is idempotent —
safe to run repeatedly against the same database. Wired into `package.json#prisma.seed`
so both `prisma migrate dev` and `prisma db seed` invoke it directly.
