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
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsService } from '../analytics.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';

const HR_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000011';
const LEARNER = 'aaaaaaaa-0000-4000-8000-000000000022';

const COURSE_1 = 'cccccccc-0000-4000-8000-000000000001';
const DEPT_1 = 'dddddddd-0000-4000-8000-000000000001';

function seedFixtures() {
  const users = [
    { id: HR_ADMIN, organizationId: ORG_A, externalId: 'auth0|hr', firstName: 'Hana', lastName: 'Admin', email: 'hana@org-a.example', status: 'ACTIVE', departmentId: DEPT_1 },
    { id: LEARNER, organizationId: ORG_A, externalId: 'auth0|learner', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', status: 'ACTIVE', departmentId: DEPT_1 },
  ];
  const courses = [
    { id: COURSE_1, organizationId: ORG_A, title: 'Safety 101', status: 'PUBLISHED', difficulty: 'BEGINNER', enrollments: [{ status: 'COMPLETED' }], modules: [] },
  ];
  const departments = [
    { id: DEPT_1, organizationId: ORG_A, name: 'Engineering', status: 'ACTIVE', users: [{ id: LEARNER, enrollments: [{ isMandatory: true, status: 'COMPLETED' }] }] },
  ];
  const enrollments = [
    { id: 'enr-1', organizationId: ORG_A, userId: LEARNER, courseId: COURSE_1, status: 'COMPLETED', completedAt: new Date() },
  ];
  const attempts = [
    { id: 'att-1', organizationId: ORG_A, userId: LEARNER, score: 90 },
  ];
  const certificates = [
    { id: 'cert-1', organizationId: ORG_A, userId: LEARNER, status: 'ACTIVE' },
  ];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|hr', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_A, userId: 'auth0|learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, departments, enrollments, attempts, certificates, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  HR_LD_ADMIN: ['course:read', 'report:view', 'user:view'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();

  return {
    user: {
      count: async ({ where }: any) => fixtures.users.filter((u) => u.organizationId === where.organizationId && u.status === where.status).length,
      findFirst: async ({ where }: any) => fixtures.users.find((u) => u.id === where.id || u.externalId === where.externalId) ?? null,
    },
    course: {
      count: async ({ where }: any) => fixtures.courses.filter((c) => c.organizationId === where.organizationId && c.status === where.status).length,
      findMany: async ({ where }: any) => fixtures.courses.filter((c) => c.organizationId === where.organizationId),
    },
    department: {
      findMany: async ({ where }: any) => fixtures.departments.filter((d) => d.organizationId === where.organizationId && d.status === where.status),
    },
    enrollment: {
      findMany: async ({ where }: any) => fixtures.enrollments.filter((e) => e.organizationId === where.organizationId && (where.userId ? e.userId === where.userId : true)),
    },
    assessmentAttempt: {
      findMany: async ({ where }: any) => fixtures.attempts.filter((a) => a.organizationId === where.organizationId && (where.userId ? a.userId === where.userId : true)),
    },
    certificate: {
      count: async ({ where }: any) => fixtures.certificates.filter((c) => c.organizationId === where.organizationId && c.status === where.status && (where.userId ? c.userId === where.userId : true)).length,
    },
  };
}

describe('Analytics API', () => {
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
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
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
          const strategy = new JwtStrategy(fakeConfigService as any);
          const originalValidate = strategy.validate.bind(strategy);
          strategy.validate = (payload: { sub: string }) => {
            const mapped = originalValidate(payload);
            const ORG_BY_USER: Record<string, string> = {
              'auth0|hr': ORG_A,
              'auth0|learner': ORG_A,
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
    const res = await request(app.getHttpServer()).get('/organizations/me/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('allows HR admin with report:view to fetch overview metrics', async () => {
    const token = await tokenFor('auth0|hr');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalLearners).toBe(2);
    expect(res.body.totalCourses).toBe(1);
    expect(res.body.completionRate).toBe(100);
    expect(res.body.averageAssessmentScore).toBe(90);
    expect(res.body.totalCertificatesIssued).toBe(1);
  });

  it('denies learner without report:view from fetching organization overview', async () => {
    const token = await tokenFor('auth0|learner');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allows learner to fetch their own learning metrics', async () => {
    const token = await tokenFor('auth0|learner');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/analytics/learner')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.completedCourses).toBe(1);
    expect(res.body.certificatesCount).toBe(1);
    expect(res.body.averageQuizScore).toBe(90);
  });
});
