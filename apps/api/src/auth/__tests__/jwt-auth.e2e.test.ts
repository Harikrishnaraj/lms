import express, { type Express } from 'express';
import { SignJWT } from 'jose';
import passport from 'passport';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { startTestJwksServer, TestJwksServer } from './test-jwks-server';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

function fakeConfigService(overrides: Record<string, string>) {
  return {
    get: (key: string) => overrides[key],
  };
}

async function signToken(
  jwks: TestJwksServer,
  claims: Record<string, unknown>,
  { expiresInSeconds = 900 }: { expiresInSeconds?: number } = {},
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: jwks.kid })
    .setIssuer(jwks.issuer)
    .setAudience(AUDIENCE)
    .setSubject((claims.sub as string) ?? 'auth0|default')
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(jwks.privateKey);
}

describe('JWT authentication (protected route)', () => {
  let jwks: TestJwksServer;
  let app: Express;

  beforeAll(async () => {
    jwks = await startTestJwksServer();

    // Fresh passport instance per strategy registration would be ideal, but
    // passport-jwt's Strategy always registers under the name 'jwt'; a single
    // JwtStrategy instance configured against our test JWKS server is enough
    // for this suite.
    new JwtStrategy(
      fakeConfigService({
        AUTH0_DOMAIN: 'unused.example.com',
        AUTH0_AUDIENCE: AUDIENCE,
        AUTH_JWKS_URI: jwks.jwksUri,
        AUTH_ISSUER: jwks.issuer,
        AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE,
      }) as never,
    );

    app = express();
    app.use(passport.initialize());
    app.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
      res.status(200).json({ user: req.user });
    });
  });

  afterAll(async () => {
    await jwks.close();
  });

  it('allows an authenticated request with a valid token and maps claims correctly', async () => {
    const token = await signToken(jwks, {
      sub: 'auth0|abc123',
      email: 'learner@example.com',
      email_verified: true,
      [`${CLAIMS_NAMESPACE}org_id`]: 'org-1',
      [`${CLAIMS_NAMESPACE}role`]: 'LEARNER',
      [`${CLAIMS_NAMESPACE}permissions`]: ['course:read'],
    });

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: 'auth0|abc123',
      email: 'learner@example.com',
      emailVerified: true,
      organizationId: 'org-1',
      role: 'LEARNER',
      permissions: ['course:read'],
    });
  });

  it('maps missing custom claims to safe defaults', async () => {
    const token = await signToken(jwks, { sub: 'auth0|nobody', email: 'nobody@example.com' });

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.organizationId).toBeNull();
    expect(response.body.user.role).toBeNull();
    expect(response.body.user.permissions).toEqual([]);
    expect(response.body.user.emailVerified).toBe(false);
  });

  it('rejects an unauthenticated request with no Authorization header', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
  });

  it('rejects a request with a malformed Authorization header', async () => {
    const response = await request(app).get('/protected').set('Authorization', 'Bearer not-a-jwt');

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = await signToken(
      jwks,
      { sub: 'auth0|expired' },
      { expiresInSeconds: -60 }, // already expired
    );

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token with an invalid signature', async () => {
    const token = await signToken(jwks, { sub: 'auth0|tampered' });
    const [header, payload, signature] = token.split('.');
    const tamperedSignature = signature.slice(0, -4) + (signature.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    const tamperedToken = `${header}.${payload}.${tamperedSignature}`;

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${tamperedToken}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token issued for a different audience', async () => {
    const token = await new SignJWT({ sub: 'auth0|wrong-aud' })
      .setProtectedHeader({ alg: 'RS256', kid: jwks.kid })
      .setIssuer(jwks.issuer)
      .setAudience('https://someone-else.example.com')
      .setSubject('auth0|wrong-aud')
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 900)
      .sign(jwks.privateKey);

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
