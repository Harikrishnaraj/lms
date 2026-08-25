import { execSync } from 'node:child_process';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 55432;
const DB_NAME = 'lms_test';
const USER = 'postgres';
const PASSWORD = 'postgres';

export function testDatabaseUrl(): string {
  return `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`;
}

export async function startTestDatabase(): Promise<EmbeddedPostgres> {
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(REPO_ROOT, 'tests', '.tmp', 'pg-data'),
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB_NAME);

  execSync('npx pnpm --filter @lms/database exec prisma migrate deploy', {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });

  return pg;
}

export async function stopTestDatabase(pg: EmbeddedPostgres): Promise<void> {
  await pg.stop();
}
