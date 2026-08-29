/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RoleKey } from '@lms/database';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { startTestJwksServer, TestJwksServer } from '../../auth/__tests__/test-jwks-server';
import { AuthorizationGuard } from '../../authorization/guards/authorization.guard';
import { AuthorizationService } from '../../authorization/authorization.service';
import { PRISMA_CLIENT } from '../../database/database.constants';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { LearningPathsService } from '../../learning-paths/learning-paths.service';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { UsersService } from '../../users/users.service';
import { AssignmentsController } from '../assignments.controller';
import { AssignmentsService } from '../assignments.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';
const ORG_A = '11111111-1111-1111-1111-111111111111';

const ALEX = 'aaaaaaaa-0000-4000-8000-000000000011'; // HR_LD_ADMIN
const PRIYA = 'aaaaaaaa-0000-4000-8000-000000000022'; // MANAGER of ENGINEERING
const SAM = 'aaaaaaaa-0000-4000-8000-000000000033'; // LEARNER in ENGINEERING
const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000044'; // LEARNER in ENGINEERING
const RILEY = 'aaaaaaaa-0000-4000-8000-000000000055'; // LEARNER, no department (outside Priya's scope)

const ENGINEERING = 'ee000000-0000-4000-8000-000000000001';
const COURSE_1 = 'cccccccc-0000-4000-8000-000000000001'; // PUBLISHED
const PATH_1 = 'dddddddd-0000-4000-8000-000000000001'; // PUBLISHED, 1 required course

function seedFixtures() {
  const users = [
    { id: ALEX, organizationId: ORG_A, externalId: 'auth0|alex', firstName: 'Alex', lastName: 'Admin', email: 'alex@org-a.example', departmentId: null, status: 'ACTIVE' },
    { id: PRIYA, organizationId: ORG_A, externalId: 'auth0|priya', firstName: 'Priya', lastName: 'Nair', email: 'priya@org-a.example', departmentId: ENGINEERING, status: 'ACTIVE' },
    { id: SAM, organizationId: ORG_A, externalId: 'auth0|sam', firstName: 'Sam', lastName: 'Rivera', email: 'sam@org-a.example', departmentId: ENGINEERING, status: 'ACTIVE' },
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: ENGINEERING, status: 'ACTIVE' },
    { id: RILEY, organizationId: ORG_A, externalId: 'auth0|riley', firstName: 'Riley', lastName: 'Diaz', email: 'riley@org-a.example', departmentId: null, status: 'ACTIVE' },
  ];
  const departments = [{ id: ENGINEERING, organizationId: ORG_A, name: 'Engineering', managerId: PRIYA }];
  const courses = [{ id: COURSE_1, organizationId: ORG_A, title: 'Safety 101', status: 'PUBLISHED' }];
  const learningPaths = [{ id: PATH_1, organizationId: ORG_A, title: 'Onboarding', status: 'PUBLISHED', createdById: ALEX, createdAt: new Date(), updatedAt: new Date() }];
  const learningPathCourses = [{ id: 'lpc-1', organizationId: ORG_A, learningPathId: PATH_1, courseId: COURSE_1, position: 0, isRequired: true }];
  const learningPathEnrollments: any[] = [];
  const enrollments: any[] = [];
  const assignments: any[] = [];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|alex', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_A, userId: 'auth0|priya', roleKey: RoleKey.MANAGER },
    { organizationId: ORG_A, userId: 'auth0|sam', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|riley', roleKey: RoleKey.LEARNER },
  ];
  return { users, departments, courses, learningPaths, learningPathCourses, learningPathEnrollments, enrollments, assignments, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  MANAGER: ['course:read', 'report:view', 'enrollment:manage', 'user:view'],
  HR_LD_ADMIN: ['course:read', 'enrollment:manage', 'learning-path:manage', 'report:view', 'report:export', 'user:view', 'user:manage'],
};

function createFakePrisma() {
  const { users, departments, courses, learningPaths, learningPathCourses, learningPathEnrollments, enrollments, assignments, memberships } = seedFixtures();

  function courseRef(courseId: string) {
    const c = courses.find((x) => x.id === courseId);
    return c ? { id: c.id, title: c.title, status: c.status, visibility: 'PRIVATE', durationMinutes: null, difficulty: null } : null;
  }
  function withPathRelations(p: any) {
    const memberRows = learningPathCourses.filter((lpc) => lpc.learningPathId === p.id).sort((a, b) => a.position - b.position).map((lpc) => ({ ...lpc, course: courseRef(lpc.courseId) }));
    return { ...p, createdBy: null, courses: memberRows };
  }
  function userRef(u: any) {
    return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email };
  }
  function withAssignmentRelations(a: any) {
    return {
      ...a,
      course: a.courseId ? { id: a.courseId, title: courses.find((c) => c.id === a.courseId)?.title } : null,
      learningPath: a.learningPathId ? { id: a.learningPathId, title: learningPaths.find((p) => p.id === a.learningPathId)?.title } : null,
      department: a.departmentId ? { id: a.departmentId, name: departments.find((d) => d.id === a.departmentId)?.name } : null,
      targetUser: a.userId ? userRef(users.find((u) => u.id === a.userId)) : null,
      createdBy: userRef(users.find((u) => u.id === a.createdById)),
    };
  }

  const prisma = {
    membership: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        return { organizationId, userId, role: { key: m.roleKey, rolePermissions: ROLE_PERMISSIONS[m.roleKey].map((k) => ({ permission: { key: k } })) } };
      },
    },
    user: {
      findFirst: async ({ where }: any) => {
        const found = users.find((u) => {
          if (u.organizationId !== where.organizationId) return false;
          if (where.id !== undefined) return u.id === where.id;
          if (where.externalId !== undefined) return u.externalId === where.externalId;
          return false;
        });
        return found ?? null;
      },
      findMany: async ({ where }: any) =>
        users.filter((u) => u.organizationId === where.organizationId && u.departmentId === where.departmentId && (where.status ? u.status === where.status : true)),
    },
    department: {
      findFirst: async ({ where }: any) => departments.find((d) => d.id === where.id && d.organizationId === where.organizationId) ?? null,
      findMany: async ({ where }: any) => departments.filter((d) => d.organizationId === where.organizationId && d.managerId === where.managerId),
    },
    course: {
      findFirst: async ({ where }: any) => courses.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
    },
    learningPath: {
      findFirst: async ({ where }: any) => {
        const p = learningPaths.find((x) => x.id === where.id && x.organizationId === where.organizationId && (where.status ? x.status === where.status : true));
        return p ? withPathRelations(p) : null;
      },
    },
    learningPathEnrollment: {
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
    },
    enrollment: {
      upsert: async ({ where, update, create }: any) => {
        const { organizationId, userId, courseId } = where.organizationId_userId_courseId;
        const existing = enrollments.find((e) => e.organizationId === organizationId && e.userId === userId && e.courseId === courseId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `enr-${enrollments.length + 1}`, status: 'NOT_STARTED', ...create };
        enrollments.push(row);
        return row;
      },
    },
    assignment: {
      create: async ({ data }: any) => {
        const row = { id: `asg-${assignments.length + 1}`, createdAt: new Date(), ...data };
        assignments.push(row);
        return withAssignmentRelations(row);
      },
      findMany: async ({ where, skip, take }: any) => {
        let rows = assignments.filter((a) => a.organizationId === where.organizationId);
        if (where.createdById) rows = rows.filter((a) => a.createdById === where.createdById);
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (typeof skip === 'number' && typeof take === 'number') rows = rows.slice(skip, skip + take);
        return rows.map(withAssignmentRelations);
      },
      count: async ({ where }: any) => {
        let rows = assignments.filter((a) => a.organizationId === where.organizationId);
        if (where.createdById) rows = rows.filter((a) => a.createdById === where.createdById);
        return rows.length;
      },
      findFirst: async ({ where }: any) => {
        const a = assignments.find((x) => x.id === where.id && x.organizationId === where.organizationId);
        return a ? withAssignmentRelations(a) : null;
      },
    },
  };

  return { prisma, enrollments, learningPathEnrollments, assignments };
}

describe('Assignments API', () => {
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
      'auth0|priya': ORG_A,
      'auth0|sam': ORG_A,
      'auth0|jordan': ORG_A,
      'auth0|riley': ORG_A,
    };
    const fakeConfigService = {
      get: (key: string) => ({ AUTH0_DOMAIN: 'unused.example.com', AUTH0_AUDIENCE: AUDIENCE, AUTH_JWKS_URI: jwks.jwksUri, AUTH_ISSUER: jwks.issuer, AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE } as Record<string, string>)[key],
    };

    const usersService = new UsersService(fake.prisma as any);
    const enrollmentsService = new EnrollmentsService(fake.prisma as any);
    const learningPathsService = new LearningPathsService(fake.prisma as any, enrollmentsService);

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AssignmentsController],
      providers: [
        AssignmentsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: LearningPathsService, useValue: learningPathsService },
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
    fake.enrollments.length = 0;
    fake.learningPathEnrollments.length = 0;
    fake.assignments.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').send({});
    expect(res.status).toBe(401);
  });

  it('a learner without enrollment:manage cannot create an assignment', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'USER', userId: JORDAN,
    });
    expect(res.status).toBe(403);
  });

  it('rejects a shape mismatch (COURSE target with a learningPathId set)', async () => {
    const token = await tokenFor('auth0|alex');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, learningPathId: PATH_1, scopeType: 'USER', userId: JORDAN,
    });
    expect(res.status).toBe(400);
  });

  it('HR admin assigns a course to a single user', async () => {
    const token = await tokenFor('auth0|alex');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'USER', userId: JORDAN, isMandatory: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.recipientCount).toBe(1);
    expect(fake.enrollments).toHaveLength(1);
    expect(fake.enrollments[0]).toMatchObject({ userId: JORDAN, courseId: COURSE_1, source: 'ADMIN', isMandatory: true });
  });

  it('HR admin assigns a course to a whole department, fanning out to every ACTIVE member', async () => {
    const token = await tokenFor('auth0|alex');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'DEPARTMENT', departmentId: ENGINEERING,
    });
    expect(res.status).toBe(201);
    expect(res.body.recipientCount).toBe(3); // Priya, Sam, Jordan
    expect(fake.enrollments).toHaveLength(3);
    expect(fake.enrollments.every((e: any) => e.source === 'ADMIN')).toBe(true);
  });

  it('a manager cannot assign to a user outside their managed department', async () => {
    const token = await tokenFor('auth0|priya');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'USER', userId: RILEY,
    });
    expect(res.status).toBe(403);
  });

  it('a manager can assign to their own department, sourced as MANAGER', async () => {
    const token = await tokenFor('auth0|priya');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'DEPARTMENT', departmentId: ENGINEERING,
    });
    expect(res.status).toBe(201);
    expect(fake.enrollments.every((e: any) => e.source === 'MANAGER')).toBe(true);
  });

  it('assigning a LEARNING_PATH cascades the path enrollment and its required course', async () => {
    const token = await tokenFor('auth0|alex');
    const res = await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${token}`).send({
      targetType: 'LEARNING_PATH', learningPathId: PATH_1, scopeType: 'USER', userId: JORDAN,
    });
    expect(res.status).toBe(201);
    expect(fake.learningPathEnrollments).toHaveLength(1);
    expect(fake.enrollments).toHaveLength(1);
    expect(fake.enrollments[0].courseId).toBe(COURSE_1);
  });

  it('a manager sees only their own assignments; HR admin sees every assignment in the org', async () => {
    const alexToken = await tokenFor('auth0|alex');
    const priyaToken = await tokenFor('auth0|priya');

    await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${alexToken}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'USER', userId: RILEY,
    });
    await request(app.getHttpServer()).post('/organizations/me/assignments').set('Authorization', `Bearer ${priyaToken}`).send({
      targetType: 'COURSE', courseId: COURSE_1, scopeType: 'DEPARTMENT', departmentId: ENGINEERING,
    });

    const asPriya = await request(app.getHttpServer()).get('/organizations/me/assignments').set('Authorization', `Bearer ${priyaToken}`);
    expect(asPriya.body.items).toHaveLength(1);
    expect(asPriya.body.items[0].createdBy.id).toBe(PRIYA);

    const asAlex = await request(app.getHttpServer()).get('/organizations/me/assignments').set('Authorization', `Bearer ${alexToken}`);
    expect(asAlex.body.items).toHaveLength(2);
  });
});
