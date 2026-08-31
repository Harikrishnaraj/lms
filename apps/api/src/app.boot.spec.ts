import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestingModule } from '@nestjs/testing';

/**
 * Boot smoke test: compiles the real `AppModule` and asserts that every
 * dependency-injection graph resolves.
 *
 * This exists because an unimported feature module (or a provider missing
 * from a module's `providers`) is invisible to both ESLint and a Prisma
 * schema push — it only surfaces when Nest actually builds the container.
 * `NotificationsModule` was missing from `app.module.ts` once and took a
 * failed Vercel deploy to find; this catches that class of bug in seconds.
 *
 * `.compile()` builds the container and instantiates providers but does NOT
 * run lifecycle hooks, so `NotificationDispatcher.onModuleInit` never starts
 * its BRPOP loop and the test cannot hang on a missing Redis.
 *
 * No database, Redis, or Auth0 tenant is required: `PRISMA_CLIENT` and
 * `REDIS_CLIENT` are overridden with inert doubles, and the environment is
 * populated with syntactically valid throwaway values below.
 */

/**
 * Must be applied before `@lms/database` is imported: it constructs a
 * `PrismaClient` at module load, which throws if `DATABASE_URL` is unset.
 * Hence the dynamic `import()`s inside `beforeAll` rather than top-level
 * imports, which the transform would hoist above this assignment.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://smoke:smoke@localhost:5432/smoke',
  REDIS_URL: 'redis://localhost:6379',
  PORT: '5000',
  AUTH0_DOMAIN: 'smoke-test.us.auth0.com',
  AUTH0_AUDIENCE: 'https://api.smoke-test.local',
  AUTH0_CLIENT_ID: 'smoke-test-client-id',
  AUTH0_CLIENT_SECRET: 'smoke-test-client-secret',
  AUTH_CLAIMS_NAMESPACE: 'https://lms.app/',
  DEV_AUTH_BYPASS: 'false',
  CORS_ORIGIN: 'http://localhost:3000',
  STORAGE_PROVIDER: 'local',
  STORAGE_LOCAL_DIR: './.data/uploads',
};

/**
 * Any property access returns a model delegate whose every method resolves
 * to `null`. Nothing is called during `compile()` — this only has to be
 * shaped like a client, not behave like one.
 */
function createPrismaDouble(): unknown {
  const model = new Proxy({}, { get: () => async () => null });
  return new Proxy(
    {},
    {
      get: (_target, property) => (property === 'then' ? undefined : model),
    },
  );
}

/**
 * Enough of an ioredis surface that nothing has to enumerate it; no socket
 * is ever opened. Unknown commands resolve to `null`, and the chainable /
 * synchronous members Nest's shutdown path touches (`on`, `duplicate`,
 * `disconnect`) return the double itself rather than a promise.
 */
function createRedisDouble(): unknown {
  const chainable = new Set(['on', 'once', 'off', 'removeListener', 'duplicate', 'disconnect']);
  const client: unknown = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === 'then') return undefined;
        if (property === 'status') return 'ready';
        if (chainable.has(String(property))) return () => client;
        return async () => null;
      },
    },
  );
  return client;
}

describe('AppModule (boot smoke test)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    for (const [key, value] of Object.entries(TEST_ENV)) {
      process.env[key] = value;
    }

    const [{ Test }, { AppModule }, { PRISMA_CLIENT }, { REDIS_CLIENT }] = await Promise.all([
      import('@nestjs/testing'),
      import('./app.module'),
      import('./database/database.constants'),
      import('./redis/redis.constants'),
    ]);

    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(createPrismaDouble())
      .overrideProvider(REDIS_CLIENT)
      .useValue(createRedisDouble())
      .compile();
  }, 60_000);

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('resolves the entire dependency graph', () => {
    expect(moduleRef).toBeDefined();
  });

  it('resolves providers exported by globally-registered modules', async () => {
    const { NotificationsService } = await import('./notifications/notifications.service');
    const { AuthorizationService } = await import('./authorization/authorization.service');

    expect(moduleRef.get(NotificationsService, { strict: false })).toBeInstanceOf(NotificationsService);
    expect(moduleRef.get(AuthorizationService, { strict: false })).toBeInstanceOf(AuthorizationService);
  });

  it('registers the health controller', async () => {
    const { AppController } = await import('./app.controller');
    expect(moduleRef.get(AppController, { strict: false })).toBeInstanceOf(AppController);
  });
});
