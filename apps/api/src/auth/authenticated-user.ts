/**
 * Internal representation of the caller, decoupled from the identity provider's
 * token shape. Every consumer of "who is making this request" (guards, decorators,
 * controllers, future authorization checks) depends on this type, never on a raw
 * JWT payload or an Auth0-specific claim name. Swapping identity providers means
 * changing `mapClaimsToAuthenticatedUser` only.
 */
export interface AuthenticatedUser {
  /** Stable subject identifier from the identity provider (JWT `sub`). */
  id: string;
  email: string | null;
  emailVerified: boolean;
  /** Tenant the caller belongs to, sourced from a custom claim. Null until an
   *  Auth0 Action populates it (see apps/api/src/auth/README.md). */
  organizationId: string | null;
  role: string | null;
  permissions: string[];
}

export interface JwtClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  [claim: string]: unknown;
}

/**
 * Decodes (without verifying) the payload of a JWT issued directly to us by the
 * identity provider over TLS moments earlier — e.g. the response to a login or
 * refresh call. Never use this on a token supplied by a client; incoming request
 * tokens are verified via signature (see strategies/jwt.strategy.ts).
 */
export function decodeJwtPayload(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: expected three dot-separated segments');
  }
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payloadJson) as JwtClaims;
}

export function mapClaimsToAuthenticatedUser(
  claims: JwtClaims,
  claimsNamespace: string,
): AuthenticatedUser {
  const orgClaim = claims[`${claimsNamespace}org_id`];
  const roleClaim = claims[`${claimsNamespace}role`];
  const permissionsClaim = claims[`${claimsNamespace}permissions`];

  return {
    id: claims.sub,
    email: claims.email ?? null,
    emailVerified: claims.email_verified ?? false,
    organizationId: typeof orgClaim === 'string' ? orgClaim : null,
    role: typeof roleClaim === 'string' ? roleClaim : null,
    permissions: Array.isArray(permissionsClaim)
      ? permissionsClaim.filter((p): p is string => typeof p === 'string')
      : [],
  };
}
