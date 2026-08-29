/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RoleKey } from '@lms/database';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { startTestJwksServer, TestJwksServer } from '../../auth/__tests__/test-jwks-server';
import { AuthorizationGuard } from '../../authorization/guards/authorization.guard';
import { AuthorizationService } from '../../authorization/authorization.service';
import { PRISMA_CLIENT } from '../../database/database.constants';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { UsersService } from '../../users/users.service';
import { LearningPathCatalogController } from '../learning-path-catalog.controller';
import { LearningPathsController } from '../learning-paths.controller';
import { LearningPathsService } from '../learning-paths.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const ALEX = 'aaaaaaaa-0000-4000-8000-000000000011'; // HR_LD_ADMIN, org A
const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000022'; // LEARNER, org A
const ORG_B_LEARNER = 'bbbbbbbb-0000-4000-8000-000000000001';

const COURSE_REQUIRED = 'cccccccc-0000-4000-8000-000000000001'; // PUBLISHED
const COURSE_OPTIONAL = 'cccccccc-0000-4000-8000-000000000002'; // PUBLISHED
const COURSE_DRAFT = 'cccccccc-0000-4000-8000-000000000003'; // DRAFT
const PATH_PUBLISHED = 'dddddddd-0000-4000-8000-000000000001';
const PATH_DRAFT = 'dddddddd-0000-4000-8000-000000000002';

function seedFixtures() {
  const users = [
    { id: ALEX, organizationId: ORG_A, externalId: 'auth0|alex', firstName: 'Alex', lastName: 'Admin', email: 'alex@org-a.example', departmentId: null },
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: null },
    { id: ORG_B_LEARNER, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', departmentId: null },
  ];
  const courses = [
    { id: COURSE_REQUIRED, organizationId: ORG_A, title: 'Required Course', status: 'PUBLISHED' },
    { id: COURSE_OPTIONAL, organizationId: ORG_A, title: 'Optional Course', status: 'PUBLISHED' },
    { id: COURSE_DRAFT, organizationId: ORG_A, title: 'Draft Course', status: 'DRAFT' },
  ];
  const learningPaths = [
    { id: PATH_PUBLISHED, organizationId: ORG_A, title: 'Onboarding', description: null, status: 'PUBLISHED', createdById: ALEX, createdAt: new Date(), updatedAt: new Date() },
    { id: PATH_DRAFT, organizationId: ORG_A, title: 'Draft Path', description: null, status: 'DRAFT', createdById: ALEX, createdAt: new Date(), updatedAt: new Date() },
  ];
  const learningPathCourses = [
    { id: 'lpc-1', organizationId: ORG_A, learningPathId: PATH_PUBLISHED, courseId: COURSE_REQUIRED, position: 0, isRequired: true },
    { id: 'lpc-2', organizationId: ORG_A, learningPathId: PATH_PUBLISHED, courseId: COURSE_OPTIONAL, position: 1, isRequired: false },
  ];
  const learningPathEnrollments: any[] = [];
  const enrollments: any[] = [];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|alex', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, learningPaths, learningPathCourses, learningPathEnrollments, enrollments, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  HR_LD_ADMIN: ['course:read', 'enrollment:manage', 'learning-path:manage', 'user:view', 'user:manage'],
};

function createFakePrisma() {
  const { users, courses, learningPaths, learningPathCourses, learningPathEnrollments, enrollments, memberships } = seedFixtures();

  function courseRef(courseId: string) {
    const c = courses.find((x) => x.id === courseId);
    return c ? { id: c.id, title: c.title, status: c.status, visibility: 'PRIVATE', durationMinutes: null, difficulty: null } : null;
  }

  function withPathRelations(p: any) {
    const memberRows = learningPathCourses
      .filter((lpc) => lpc.learningPathId === p.id)
      .sort((a, b) => a.position - b.position)
      .map((lpc) => ({ ...lpc, course: courseRef(lpc.courseId) }));
    const creator = users.find((u) => u.id === p.createdById) ?? null;
    return { ...p, createdBy: creator, courses: memberRows };
  }

  const prisma = {
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    membership: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        return { organizationId, userId, role: { key: m.roleKey, rolePermissions: ROLE_PERMISSIONS[m.roleKey].map((k) => ({ permission: { key: k } })) } };
      },
    },
    user: {
      findFirst: async ({ where }: any) =>
        users.find((u) => {
          if (u.organizationId !== where.organizationId) return false;
          if (where.id !== undefined) return u.id === where.id;
          if (where.externalId !== undefined) return u.externalId === where.externalId;
          return false;
        }) ?? null,
    },
    course: {
      findFirst: async ({ where }: any) => courses.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
    },
    learningPath: {
      findFirst: async ({ where }: any) => {
        const p = learningPaths.find(
          (x) => x.id === where.id && x.organizationId === where.organizationId && (where.status ? x.status === where.status : true),
        );
        return p ? withPathRelations(p) : null;
      },
      findMany: async ({ where, skip, take }: any) => {
        let rows = learningPaths.filter((p) => p.organizationId === where.organizationId);
        if (where.status) rows = rows.filter((p) => p.status === where.status);
        rows = rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        if (typeof skip === 'number' && typeof take === 'number') rows = rows.slice(skip, skip + take);
        return rows.map(withPathRelations);
      },
      count: async ({ where }: any) => {
        let rows = learningPaths.filter((p) => p.organizationId === where.organizationId);
        if (where.status) rows = rows.filter((p) => p.status === where.status);
        return rows.length;
      },
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), organizationId: data.organizationId, title: data.title, description: data.description ?? null, status: 'DRAFT', createdById: data.createdById, createdAt: new Date(), updatedAt: new Date() };
        learningPaths.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const p = learningPaths.find((x) => x.id === where.id);
        if (!p) throw new Error('not found');
        Object.assign(p, data);
        return p;
      },
    },
    learningPathCourse: {
      findUnique: async ({ where }: any) => {
        const { learningPathId, courseId } = where.learningPathId_courseId;
        return learningPathCourses.find((lpc) => lpc.learningPathId === learningPathId && lpc.courseId === courseId) ?? null;
      },
      count: async ({ where }: any) => learningPathCourses.filter((lpc) => lpc.learningPathId === where.learningPathId).length,
      create: async ({ data }: any) => {
        const row = { id: `lpc-${learningPathCourses.length + 1}`, ...data };
        learningPathCourses.push(row);
        return row;
      },
      delete: async ({ where }: any) => {
        const idx = learningPathCourses.findIndex((lpc) => lpc.id === where.id);
        const [removed] = learningPathCourses.splice(idx, 1);
        return removed;
      },
      findMany: async ({ where }: any) =>
        learningPathCourses.filter((lpc) => lpc.learningPathId === where.learningPathId).sort((a, b) => a.position - b.position),
      update: async ({ where, data }: any) => {
        const row = learningPathCourses.find((lpc) => lpc.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    learningPathEnrollment: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId, learningPathId } = where.organizationId_userId_learningPathId;
        return learningPathEnrollments.find((e) => e.organizationId === organizationId && e.userId === userId && e.learningPathId === learningPathId) ?? null;
      },
      upsert: async ({ where, update, create }: any) => {
        const { organizationId, userId, learningPathId } = where.organizationId_userId_learningPathId;
        const existing = learningPathEnrollments.find((e) => e.organizationId === organizationId && e.userId === userId && e.learningPathId === learningPathId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `lpe-${learningPathEnrollments.length + 1}`, ...create };
        learningPathEnrollments.push(row);
        return row;
      },
      findMany: async ({ where }: any) => learningPathEnrollments.filter((e) => e.organizationId === where.organizationId && e.userId === where.userId),
    },
    enrollment: {
      findMany: async ({ where }: any) =>
        enrollments.filter((e) => e.organizationId === where.organizationId && e.userId === where.userId && where.courseId.in.includes(e.courseId)),
      upsert: async ({ where, update, create }: any) => {
        const { organizationId, userId, courseId } = where.organizationId_userId_courseId;
        const existing = enrollments.find((e) => e.organizationId === organizationId && e.userId === userId && e.courseId === courseId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `enr-${enrollments.length + 1}`, status: 'NOT_STARTED', startedAt: null, completedAt: null, ...create };
        enrollments.push(row);
        return row;
      },
    },
  };

  return { prisma, learningPaths, learningPathCourses, learningPathEnrollments, enrollments };
}

describe('Learning Paths API', () => {
  let app: INestApplication;
  let jwks: TestJwksServer;
  let fake: ReturnType<typeof createFakePrisma>;

  async function tokenFor(userId: string): Promise<string> {
    return new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: jwks.kid })
      .setIssuer(jwks.issuer).setAudience(AUDIENCE).setSubject(userId)
      .setIssuedAt().setExpirationTime('15m').sign(jwks.privateKey);
  }

  beforeAll(async () => {
    jwks = await startTestJwksServer();
    fake = createFakePrisma();

    const ORG_BY_USER: Record<string, string> = {
      'auth0|alex': ORG_A,
      'auth0|jordan': ORG_A,
      'auth0|b-learner': ORG_B,
    };
    const fakeConfigService = {
      get: (key: string) =>
        ({ AUTH0_DOMAIN: 'unused.example.com', AUTH0_AUDIENCE: AUDIENCE, AUTH_JWKS_URI: jwks.jwksUri, AUTH_ISSUER: jwks.issuer, AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE } as Record<string, string>)[key],
    };

    const usersService = new UsersService(fake.prisma as any);
    const enrollmentsService = new EnrollmentsService(fake.prisma as any);

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [LearningPathsController, LearningPathCatalogController],
      providers: [
        LearningPathsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: UsersService, useValue: usersService },
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
            return { ...mapped, organizationId: ORG_BY_USER[payload.sub] ?? null };
          };
          return strategy;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  beforeEach(() => {
    const reseeded = createFakePrisma();
    fake.learningPaths.length = 0;
    fake.learningPaths.push(...reseeded.learningPaths);
    fake.learningPathCourses.length = 0;
    fake.learningPathCourses.push(...reseeded.learningPathCourses);
    fake.learningPathEnrollments.length = 0;
    fake.enrollments.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/learning-path-catalog');
    expect(res.status).toBe(401);
  });

  it('a learner cannot reach the admin authoring surface', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/learning-paths').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('HR/L&D admin can create a path, add a course, and publish it', async () => {
    const token = await tokenFor('auth0|alex');

    const created = await request(app.getHttpServer())
      .post('/organizations/me/learning-paths')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Path' });
    expect(created.status).toBe(201);
    const pathId = created.body.id;

    const withCourse = await request(app.getHttpServer())
      .post(`/organizations/me/learning-paths/${pathId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: COURSE_REQUIRED, isRequired: true });
    expect(withCourse.status).toBe(201);
    expect(withCourse.body.courses).toHaveLength(1);

    const published = await request(app.getHttpServer())
      .patch(`/organizations/me/learning-paths/${pathId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('PUBLISHED');
  });

  it('refuses to publish a path whose required course is not itself published', async () => {
    const token = await tokenFor('auth0|alex');

    const withDraftCourse = await request(app.getHttpServer())
      .post(`/organizations/me/learning-paths/${PATH_DRAFT}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: COURSE_DRAFT, isRequired: true });
    expect(withDraftCourse.status).toBe(201);

    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/learning-paths/${PATH_DRAFT}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' });
    expect(res.status).toBe(400);
  });

  it('the learner catalog only ever returns PUBLISHED paths', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/learning-path-catalog').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(PATH_PUBLISHED);
    expect(res.body.items[0].progress.status).toBe('NOT_STARTED');
    expect(res.body.items[0].progress.isEnrolled).toBe(false);
  });

  it('a cross-tenant learner gets a 404, not a 403, for a published path', async () => {
    const token = await tokenFor('auth0|b-learner');
    const res = await request(app.getHttpServer()).get(`/organizations/me/learning-path-catalog/${PATH_PUBLISHED}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('self-enrolling cascades an Enrollment for the required course only, and rejects a repeat enrollment', async () => {
    const token = await tokenFor('auth0|jordan');

    const enrolled = await request(app.getHttpServer())
      .post(`/organizations/me/learning-path-catalog/${PATH_PUBLISHED}/enroll`)
      .set('Authorization', `Bearer ${token}`);
    expect(enrolled.status).toBe(201);
    expect(enrolled.body.isEnrolled).toBe(true);
    expect(enrolled.body.courses.find((c: any) => c.courseId === COURSE_REQUIRED).enrollmentStatus).toBe('NOT_STARTED');
    expect(enrolled.body.courses.find((c: any) => c.courseId === COURSE_OPTIONAL).enrollmentStatus).toBe('NOT_ENROLLED');
    expect(fake.enrollments).toHaveLength(1);
    expect(fake.enrollments[0].courseId).toBe(COURSE_REQUIRED);
    expect(fake.enrollments[0].source).toBe('SELF');

    const again = await request(app.getHttpServer())
      .post(`/organizations/me/learning-path-catalog/${PATH_PUBLISHED}/enroll`)
      .set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(409);
  });
});
