import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { startTestJwksServer, TestJwksServer } from '../../auth/__tests__/test-jwks-server';
import { PRISMA_CLIENT } from '../../database/database.constants';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { OrganizationsController } from '../organizations.controller';
import { OrganizationsService } from '../organizations.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Organization A',
  slug: 'org-a',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const ORG_B = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Organization B',
  slug: 'org-b',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

/**
 * This is the security-critical suite: it proves, over real HTTP through the
 * real guard/interceptor/controller/service pipeline, that a caller's
 * organization identity is derived solely from their verified JWT and that no
 * request can read or write another organization's data — regardless of what
 * id it asks for. Only the persistence layer (Prisma) is faked; everything
 * above it (JwtAuthGuard, TenantContextInterceptor, OrganizationsController,
 * OrganizationsService) is real.
 */
describe('Tenant isolation: Organizations (security-critical)', () => {
  let app: INestApplication;
  let jwks: TestJwksServer;

  const fakePrisma = {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  async function tokenFor(organizationId: string | undefined, sub = 'auth0|user'): Promise<string> {
    const claims: Record<string, unknown> = { sub };
    if (organizationId) {
      claims[`${CLAIMS_NAMESPACE}org_id`] = organizationId;
    }
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: jwks.kid })
      .setIssuer(jwks.issuer)
      .setAudience(AUDIENCE)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(jwks.privateKey);
  }

  beforeAll(async () => {
    jwks = await startTestJwksServer();

    const fakeConfigService = {
      get: (key: string) =>
        (
          {
            AUTH0_DOMAIN: 'unused.example.com',
            AUTH0_AUDIENCE: AUDIENCE,
            AUTH_JWKS_URI: jwks.jwksUri,
            AUTH_ISSUER: jwks.issuer,
            AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE,
          } as Record<string, string>
        )[key],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [OrganizationsController],
      providers: [
        OrganizationsService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: PRISMA_CLIENT, useValue: fakePrisma },
        { provide: ConfigService, useValue: fakeConfigService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  beforeEach(() => {
    fakePrisma.organization.findUnique.mockReset();
    fakePrisma.organization.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === ORG_A.id) return Promise.resolve(ORG_A);
        if (where.id === ORG_B.id) return Promise.resolve(ORG_B);
        return Promise.resolve(null);
      },
    );
  });

  it('allows a user to read their own organization via /organizations/me', async () => {
    const token = await tokenFor(ORG_A.id);

    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ORG_A.id);
    expect(response.body.name).toBe('Organization A');
  });

  it('allows a user to read their own organization by id', async () => {
    const token = await tokenFor(ORG_A.id);

    const response = await request(app.getHttpServer())
      .get(`/organizations/${ORG_A.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ORG_A.id);
  });

  it('SECURITY: a user from Organization A cannot read Organization B by id', async () => {
    const tokenForOrgA = await tokenFor(ORG_A.id);

    const response = await request(app.getHttpServer())
      .get(`/organizations/${ORG_B.id}`)
      .set('Authorization', `Bearer ${tokenForOrgA}`);

    expect(response.status).toBe(404);
    // The response must not leak Organization B's name/slug/etc.
    expect(JSON.stringify(response.body)).not.toContain('Organization B');
    expect(JSON.stringify(response.body)).not.toContain(ORG_B.slug);
  });

  it('SECURITY: /organizations/me always resolves to the caller\'s own org, never another tenant\'s', async () => {
    const tokenForOrgB = await tokenFor(ORG_B.id);

    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Authorization', `Bearer ${tokenForOrgB}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ORG_B.id);
    expect(response.body.id).not.toBe(ORG_A.id);
  });

  it('SECURITY: a user from Organization A cannot update Organization B', async () => {
    const tokenForOrgA = await tokenFor(ORG_A.id);

    // updateOwn only ever targets the caller's own organizationId — there is
    // no id parameter to manipulate. Verify Prisma is never even asked to
    // touch Organization B's row.
    await request(app.getHttpServer())
      .patch('/organizations/me')
      .set('Authorization', `Bearer ${tokenForOrgA}`)
      .send({ name: 'Hostile Rename' });

    expect(fakePrisma.organization.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ORG_B.id } }),
    );
  });

  it('rejects a request whose token has no organization claim at all', async () => {
    const token = await tokenFor(undefined);

    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated request outright', async () => {
    const response = await request(app.getHttpServer()).get(`/organizations/${ORG_A.id}`);

    expect(response.status).toBe(401);
  });

  it('never queries Prisma with an organizationId sourced from anywhere but the token', async () => {
    // Attempt to smuggle a different org id via query string / body, which
    // the controller doesn't even accept as a scoping parameter — this
    // documents the "never trust client-supplied org_id" rule at the seam
    // where it would matter if a future refactor added such a parameter.
    const token = await tokenFor(ORG_A.id);

    const response = await request(app.getHttpServer())
      .get(`/organizations/me?organizationId=${ORG_B.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ORG_A.id);
  });
});
