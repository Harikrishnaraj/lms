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

  REFRESH_SESSION_COOKIE_NAME: z.string().default('lms_sid'),
  REFRESH_SESSION_TTL_SECONDS: z.coerce.number().default(7 * 24 * 60 * 60),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> = process.env): Env {
  return envSchema.parse(config);
}
