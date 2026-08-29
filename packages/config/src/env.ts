import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(5000),

  // Authentication is externalized to an OAuth2/OIDC identity provider (Auth0) per the
  // TRD — the API never stores or validates passwords itself. See apps/api/src/auth/README.md.
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_CONNECTION: z.string().default('Username-Password-Authentication'),
  // Machine-to-machine credentials for the Auth0 Management API (resend verification email).
  AUTH0_MGMT_CLIENT_ID: z.string().optional(),
  AUTH0_MGMT_CLIENT_SECRET: z.string().optional(),
  // Namespace used for custom claims (org_id, role, permissions) added to tokens via an
  // Auth0 Action. Must match the namespace configured in the Auth0 tenant.
  AUTH_CLAIMS_NAMESPACE: z.string().url().default('https://lms.app/'),
  // Overrides for the JWKS URI / issuer, normally derived from AUTH0_DOMAIN. Used in tests
  // to point the JWT strategy at a local, ephemeral JWKS server instead of Auth0.
  AUTH_JWKS_URI: z.string().url().optional(),
  AUTH_ISSUER: z.string().url().optional(),

  // Local-only "sign in as a seeded demo user" side door (apps/api/src/auth/dev/),
  // for manually exercising the app without a live Auth0 tenant. Never valid
  // when NODE_ENV=production — see the guard in validateEnv below.
  DEV_AUTH_BYPASS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  REFRESH_SESSION_COOKIE_NAME: z.string().default('lms_sid'),
  REFRESH_SESSION_TTL_SECONDS: z.coerce.number().default(7 * 24 * 60 * 60),

  // Comma-separated list of origins allowed to make credentialed (cookie-
  // carrying) requests — the Next.js dev server by default. Needed for the
  // session cookie set by POST /auth/login to survive a cross-origin fetch
  // from apps/web (see apps/web/src/lib/api-client.ts).
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Object storage for uploaded course content (Task 12). 'local' writes to
  // disk through this API's own endpoints — fine for dev, never for
  // production. 'S3' targets any S3-compatible endpoint (AWS S3, MinIO,
  // Cloudflare R2, ...) via presigned URLs; see apps/api/src/storage/README.md.
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./.data/uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> = process.env): Env {
  const env = envSchema.parse(config);
  if (env.DEV_AUTH_BYPASS && env.NODE_ENV === 'production') {
    throw new Error('DEV_AUTH_BYPASS must not be enabled when NODE_ENV=production');
  }
  if (env.STORAGE_PROVIDER === 's3') {
    const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(`STORAGE_PROVIDER=s3 requires ${missing.join(', ')}`);
    }
  }
  return env;
}
