/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RoleKey } from '@lms/database';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { startTestJwksServer, TestJwksServer } from '../../auth/__tests__/test-jwks-server';
import { AuthorizationGuard } from '../../authorization/guards/authorization.guard';
import { AuthorizationService } from '../../authorization/authorization.service';
import { PRISMA_CLIENT } from '../../database/database.constants';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { UsersService } from '../../users/users.service';
import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const HR_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000011'; // has user:view
const LEARNER = 'aaaaaaaa-0000-4000-8000-000000000022'; // lacks user:view
const USER_B = 'bbbbbbbb-0000-4000-8000-000000000033'; // Org B learner

const COURSE_A = 'cccccccc-0000-4000-8000-000000000001';
const COURSE_B = 'cccccccc-0000-4000-8000-000000000002';
const PATH_A = 'dddddddd-0000-4000-8000-000000000001';

function seedFixtures() {
  const users = [
    { id: HR_ADMIN, organizationId: ORG_A, externalId: 'auth0|hr', firstName: 'Hana', lastName: 'Admin', email: 'hana@org-a.example', status: 'ACTIVE' },
    { id: LEARNER, organizationId: ORG_A, externalId: 'auth0|learner', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', status: 'ACTIVE' },
    { id: USER_B, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', status: 'ACTIVE' },
  ];
  const courses = [
    { id: COURSE_A, organizationId: ORG_A, title: 'Workplace Safety Course', description: 'Mandatory safety instructions', status: 'PUBLISHED' },
    { id: COURSE_B, organizationId: ORG_B, title: 'Corporate Ethics Course', description: 'Org B rules', status: 'PUBLISHED' },
  ];
  const learningPaths = [
    { id: PATH_A, organizationId: ORG_A, title: 'Onboarding Path', description: 'Getting started guide', status: 'PUBLISHED' },
  ];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|hr', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_A, userId: 'auth0|learner', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, learningPaths, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  HR_LD_ADMIN: ['course:read', 'user:view'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();
  const { users, courses, learningPaths } = fixtures;

  return {
    course: {
      findMany: async ({ where }: any) => {
        return courses.filter(
          (c) =>
            c.organizationId === where.organizationId &&
            c.status === where.status &&
            (c.title.toLowerCase().includes(where.OR[0].title.contains.toLowerCase()) ||
              c.description.toLowerCase().includes(where.OR[1].description.contains.toLowerCase())),
        );
      },
    },
    learningPath: {
      findMany: async ({ where }: any) => {
        return learningPaths.filter(
          (p) =>
            p.organizationId === where.organizationId &&
            p.status === where.status &&
            (p.title.toLowerCase().includes(where.OR[0].title.contains.toLowerCase()) ||
              p.description.toLowerCase().includes(where.OR[1].description.contains.toLowerCase())),
        );
      },
    },
    user: {
      findFirst: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
      findMany: async ({ where }: any) => {
        return users.filter(
          (u) =>
            u.organizationId === where.organizationId &&
            u.status === where.status &&
            (u.firstName.toLowerCase().includes(where.OR[0].firstName.contains.toLowerCase()) ||
              u.lastName.toLowerCase().includes(where.OR[1].lastName.contains.toLowerCase()) ||
              u.email.toLowerCase().includes(where.OR[2].email.contains.toLowerCase())),
        );
      },
    },
    membership: {
      findMany: async () => [],
    },
  };
}

describe('Search API', () => {
  let app: INestApplication;
  let jwksServer: TestJwksServer;
  const fake = { prisma: createFakePrisma() };

  beforeAll(async () => {
    jwksServer = await startTestJwksServer();
  });

  afterAll(async () => {
    await jwksServer.close();
  });

  beforeEach(async () => {
    const fakeConfigService = {
      get: (key: string) => fakeConfigService.getOrThrow(key),
      getOrThrow: (key: string) =>
        ({
          AUTH0_DOMAIN: 'unused.example.com',
          AUTH0_AUDIENCE: AUDIENCE,
          AUTH_JWKS_URI: jwksServer.jwksUri,
          AUTH_ISSUER: jwksServer.issuer,
          AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE,
        } as Record<string, string>)[key],
    };

    const usersService = new UsersService(fake.prisma as any);
    const authorizationService = {
      resolve: async (orgId: string, extId: string) => {
        const m = seedFixtures().memberships.find((x) => x.organizationId === orgId && x.userId === extId);
        if (!m) return null;
        return { role: m.roleKey, permissions: ROLE_PERMISSIONS[m.roleKey] ?? [] };
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [SearchController],
      providers: [
        SearchService,
        TenantContextStorage,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: PRISMA_CLIENT, useValue: fake.prisma },
        { provide: ConfigService, useValue: fakeConfigService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: AuthorizationGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
      ],
    })
      .overrideProvider(JwtStrategy)
      .useFactory({
        factory: () => {
          const strategy = new JwtStrategy(fakeConfigService as never);
          const originalValidate = strategy.validate.bind(strategy);
          strategy.validate = (payload: { sub: string }) => {
            const mapped = originalValidate(payload);
            const ORG_BY_USER: Record<string, string> = {
              'auth0|hr': ORG_A,
              'auth0|learner': ORG_A,
              'auth0|b-learner': ORG_B,
            };
            return { ...mapped, organizationId: ORG_BY_USER[payload.sub] ?? null };
          };
          return strategy;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function tokenFor(sub: string) {
    return new SignJWT({
      iss: jwksServer.issuer,
      sub,
      aud: AUDIENCE,
      [`${CLAIMS_NAMESPACE}roles`]: [],
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwksServer.kid })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(jwksServer.privateKey);
  }

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/search?q=safety');
    expect(res.status).toBe(401);
  });

  it('searches courses and paths under isolation', async () => {
    const token = await tokenFor('auth0|learner');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/search?q=Safety')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Should find course Safety Course
    const courseMatch = res.body.find((item: any) => item.type === 'COURSE');
    expect(courseMatch).toBeDefined();
    expect(courseMatch.title).toBe('Workplace Safety Course');

    // Should NOT leak course from Org B
    const leaked = res.body.find((item: any) => item.title.includes('Ethics'));
    expect(leaked).toBeUndefined();
  });

  it('restricts user listing to search callers holding user:view permission', async () => {
    // 1. Learner (no user:view)
    const learnerToken = await tokenFor('auth0|learner');
    const learnerRes = await request(app.getHttpServer())
      .get('/organizations/me/search?q=Jordan')
      .set('Authorization', `Bearer ${learnerToken}`);

    expect(learnerRes.status).toBe(200);
    const userResult = learnerRes.body.find((item: any) => item.type === 'USER');
    expect(userResult).toBeUndefined();

    // 2. HR Admin (has user:view)
    const hrToken = await tokenFor('auth0|hr');
    const hrRes = await request(app.getHttpServer())
      .get('/organizations/me/search?q=Jordan')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(hrRes.status).toBe(200);
    const adminUserResult = hrRes.body.find((item: any) => item.type === 'USER');
    expect(adminUserResult).toBeDefined();
    expect(adminUserResult.title).toBe('Jordan Lee');
  });
});
