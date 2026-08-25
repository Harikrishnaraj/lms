# Authentication

Per the TRD (`Authentication: OAuth2 / OIDC Identity Provider`), credential storage,
password hashing, signup, email verification, and password recovery are all
externalized to an identity provider — this codebase never stores a password or
verification token. **Auth0** was chosen as the concrete provider: it is a standard
OIDC provider with first-class support for the exact flows required (hosted
password-reset and email-verification pages, refresh token rotation, custom
claims), and its REST contract is stable and well documented.

The provider is not a first-class concept anywhere outside this module. Everything
the rest of the app depends on is:

- `AuthenticatedUser` (`authenticated-user.ts`) — the internal shape of "who is
  making this request." Controllers and future authorization code depend on this,
  never on a raw JWT payload or an Auth0 claim name.
- `IdentityProviderPort` (`ports/identity-provider.port.ts`) — the operations
  `AuthService` needs (login, signup, password reset, etc.), named around our
  domain. `Auth0IdentityProvider` is the only class that knows Auth0's HTTP
  contract. Swapping providers means writing a new adapter and changing one line
  in `auth.module.ts`.
- `SessionStorePort` (`ports/session-store.port.ts`) — local, Redis-backed,
  revocable session records, keyed by an opaque id in an HttpOnly cookie.

## Flow

| Concern | Endpoint | Notes |
|---|---|---|
| Signup | `POST /api/v1/auth/signup` | Creates the user in Auth0's database connection. Auth0 emails a verification link automatically (if enabled on the tenant). |
| Login | `POST /api/v1/auth/login` | Validates credentials against Auth0 (Resource Owner Password Grant, realm-based). Returns a short-lived access token; sets an HttpOnly, Secure, SameSite=Strict session cookie. |
| Email verification | `POST /api/v1/auth/email/verify/resend` | Re-sends Auth0's verification email via the Management API. Confirmation itself happens on Auth0's hosted page — this API never sees the verification token. |
| Password recovery | `POST /api/v1/auth/password/forgot` | Triggers Auth0's hosted password-reset email flow. Always returns a generic success message, regardless of whether the email is registered. |
| Session management / refresh | `POST /api/v1/auth/refresh` | Reads the session cookie, looks up the session in Redis (revocation check), exchanges the stored Auth0 refresh token for a new access token. |
| Logout | `POST /api/v1/auth/logout` | Deletes the Redis session record and best-effort revokes the refresh token at Auth0. Idempotent. |
| Current user | `GET /api/v1/auth/me` | Returns the `AuthenticatedUser` derived from the verified access token. |

## Access tokens

Incoming requests carry `Authorization: Bearer <access token>`. `JwtStrategy`
verifies the signature via `jwks-rsa` against Auth0's JWKS endpoint (no shared
secret is held by this API), and checks `iss`/`aud`/`exp`. `JwtAuthGuard` is
applied globally (`APP_GUARD` in `auth.module.ts`); routes that must be reachable
without a token are marked `@Public()`.

## Sessions (refresh tokens)

Auth0's own refresh token is never exposed to the browser. On login, it is stored
server-side in Redis under a random session id (`create` in
`RedisSessionStore`), and only that opaque id is set as an HttpOnly cookie. This
means:

- Logout deletes the Redis record immediately — the session is dead even if the
  best-effort call to Auth0's `/oauth/revoke` is slow or fails.
- A leaked session cookie by itself does not leak the real Auth0 refresh token.

## Custom claims (org_id, role, permissions)

`organizationId`, `role`, and `permissions` on `AuthenticatedUser` are sourced
from custom claims under `AUTH_CLAIMS_NAMESPACE` (default `https://lms.app/`).
Auth0 does not add these by default — they must be attached by an
[Auth0 Action](https://auth0.com/docs/customize/actions) on the
post-login trigger, e.g.:

```js
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://lms.app/';
  api.accessToken.setCustomClaim(`${namespace}org_id`, event.user.app_metadata?.org_id);
  api.accessToken.setCustomClaim(`${namespace}role`, event.user.app_metadata?.role);
  api.accessToken.setCustomClaim(`${namespace}permissions`, event.user.app_metadata?.permissions ?? []);
};
```

Until that Action is configured, `organizationId` and `role` on
`AuthenticatedUser` are `null` and `permissions` is `[]` — the mapper degrades
safely rather than throwing, since no local `User`/role table exists yet (see
`database/prisma/schema.prisma`).

## Required Auth0 tenant configuration

1. A database connection (default name `Username-Password-Authentication`,
   overridable via `AUTH0_CONNECTION`) with **Requires Username** off and email
   verification enabled.
2. A "Regular Web App" or "Native"/"SPA" application (`AUTH0_CLIENT_ID` /
   `AUTH0_CLIENT_SECRET`) with the Password realm grant enabled and
   `offline_access` allowed, so login returns a refresh token.
3. An API (`AUTH0_AUDIENCE`) representing this backend.
4. Optional: an M2M application authorized for the Management API's
   `update:users` scope, for `AUTH0_MGMT_CLIENT_ID`/`AUTH0_MGMT_CLIENT_SECRET`
   (only needed for the resend-verification endpoint).
5. The post-login Action above, if org/role/permission claims are needed.

See `infrastructure/.env.example` for the full list of environment variables.

## Testing without a live Auth0 tenant

`JwtStrategy` derives its JWKS URI and issuer from `AUTH0_DOMAIN` unless
`AUTH_JWKS_URI` / `AUTH_ISSUER` are explicitly set. Tests set those overrides to
point at a short-lived, local JWKS server signing tokens with a throwaway RSA
keypair — this exercises the real signature/issuer/audience/expiry verification
path without any network dependency on Auth0. See
`src/auth/__tests__/jwt-auth.e2e.test.ts`.
