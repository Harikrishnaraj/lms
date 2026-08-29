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
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { UsersService } from '../../users/users.service';
import { EnrollmentsController } from '../enrollments.controller';
import { EnrollmentsService } from '../enrollments.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

// Org A fixtures: Priya manages Engineering; Jordan (learner) is in
// Engineering; Riley (learner) is in Sales, outside Priya's scope.
const PRIYA = 'aaaaaaaa-0000-4000-8000-000000000011'; // MANAGER, manages ENG_DEPT
const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000022'; // LEARNER, in ENG_DEPT
const RILEY = 'aaaaaaaa-0000-4000-8000-000000000033'; // LEARNER, in SALES_DEPT
const HR_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000044'; // HR_LD_ADMIN
const ENG_DEPT = 'dddddddd-0000-4000-8000-000000000001';
const SALES_DEPT = 'dddddddd-0000-4000-8000-000000000002';

const PUBLISHED_PUBLIC_COURSE = 'cccccccc-0000-4000-8000-000000000001';
const DRAFT_COURSE = 'cccccccc-0000-4000-8000-000000000002';
const PUBLISHED_PRIVATE_COURSE = 'cccccccc-0000-4000-8000-000000000003';

// Org B fixtures — only used to prove cross-tenant isolation.
const ORG_B_LEARNER = 'bbbbbbbb-0000-4000-8000-000000000001';
const ORG_B_COURSE = 'cccccccc-0000-4000-8000-0000000000bb';

function seedFixtures() {
  const now = new Date('2026-01-01T00:00:00Z');
  const users = [
    { id: PRIYA, organizationId: ORG_A, externalId: 'auth0|priya', firstName: 'Priya', lastName: 'Nair', email: 'priya@org-a.example', departmentId: ENG_DEPT },
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: ENG_DEPT },
    { id: RILEY, organizationId: ORG_A, externalId: 'auth0|riley', firstName: 'Riley', lastName: 'Diaz', email: 'riley@org-a.example', departmentId: SALES_DEPT },
    { id: HR_ADMIN, organizationId: ORG_A, externalId: 'auth0|hr', firstName: 'Hana', lastName: 'Admin', email: 'hana@org-a.example', departmentId: null },
    { id: ORG_B_LEARNER, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', departmentId: null },
  ];
  const departments = [
    { id: ENG_DEPT, organizationId: ORG_A, managerId: PRIYA },
    { id: SALES_DEPT, organizationId: ORG_A, managerId: null },
  ];
  const courses = [
    { id: PUBLISHED_PUBLIC_COURSE, organizationId: ORG_A, title: 'Workplace Safety', status: 'PUBLISHED', visibility: 'PUBLIC' },
    { id: DRAFT_COURSE, organizationId: ORG_A, title: 'Unfinished Course', status: 'DRAFT', visibility: 'PUBLIC' },
    { id: PUBLISHED_PRIVATE_COURSE, organizationId: ORG_A, title: 'Leadership Track', status: 'PUBLISHED', visibility: 'PRIVATE' },
    { id: ORG_B_COURSE, organizationId: ORG_B, title: 'Sales 101', status: 'PUBLISHED', visibility: 'PUBLIC' },
  ];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|priya', roleKey: RoleKey.MANAGER },
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|riley', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|hr', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  const enrollments: any[] = [];
  return { now, users, departments, courses, memberships, enrollments };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  MANAGER: ['course:read', 'enrollment:manage', 'user:view'],
  HR_LD_ADMIN: ['course:read', 'enrollment:manage', 'user:view', 'user:manage'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();
  const { users, departments, courses, memberships, enrollments } = fixtures;

  const prisma = {
    membership: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        return {
          organizationId,
          userId,
          role: { key: m.roleKey, rolePermissions: ROLE_PERMISSIONS[m.roleKey].map((k) => ({ permission: { key: k } })) },
        };
      },
    },
    user: {
      // Matches either an id lookup (assign/manager-scope checks) or an
      // externalId lookup (UsersService.findByExternalId, used by every
      // controller's resolveCaller) against the same fixture set.
      findFirst: async ({ where }: any) =>
        users.find((u) => {
          if (u.organizationId !== where.organizationId) return false;
          if (where.id !== undefined) return u.id === where.id;
          if (where.externalId !== undefined) return u.externalId === where.externalId;
          return false;
        }) ?? null,
    },
    department: {
      findMany: async ({ where }: any) =>
        departments.filter((d) => d.organizationId === where.organizationId && d.managerId === where.managerId),
    },
    course: {
      findFirst: async ({ where }: any) => courses.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
    },
    enrollment: {
      findUnique: async ({ where }: any) => {
        const key = where.organizationId_userId_courseId;
        return enrollments.find((e) => e.organizationId === key.organizationId && e.userId === key.userId && e.courseId === key.courseId) ?? null;
      },
      findFirst: async ({ where }: any) => enrollments.find((e) => e.id === where.id && e.organizationId === where.organizationId) ?? null,
      findMany: async ({ where, skip = 0, take }: any) => {
        const filtered = enrollments.filter((e) => matchesWhere(e, where));
        return filtered.slice(skip, take ? skip + take : undefined).map(withRelations);
      },
      count: async ({ where }: any) => enrollments.filter((e) => matchesWhere(e, where)).length,
      create: async ({ data }: any) => {
        const now = new Date();
        const created = {
          id: randomUUID(),
          organizationId: data.organizationId,
          userId: data.userId,
          courseId: data.courseId,
          status: 'NOT_STARTED',
          isMandatory: data.isMandatory ?? false,
          source: data.source,
          assignedById: data.assignedById ?? null,
          dueDate: data.dueDate ?? null,
          startedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        enrollments.push(created);
        return withRelations(created);
      },
      upsert: async ({ where, update, create }: any) => {
        const key = where.organizationId_userId_courseId;
        const existing = enrollments.find(
          (e) => e.organizationId === key.organizationId && e.userId === key.userId && e.courseId === key.courseId,
        );
        if (existing) {
          if (update.isMandatory !== undefined) existing.isMandatory = update.isMandatory;
          if (update.dueDate !== undefined) existing.dueDate = update.dueDate;
          existing.source = update.source;
          existing.assignedById = update.assignedById;
          existing.updatedAt = new Date();
          return withRelations(existing);
        }
        const now = new Date();
        const created = {
          id: randomUUID(),
          organizationId: create.organizationId,
          userId: create.userId,
          courseId: create.courseId,
          status: 'NOT_STARTED',
          isMandatory: create.isMandatory ?? false,
          source: create.source,
          assignedById: create.assignedById ?? null,
          dueDate: create.dueDate ?? null,
          startedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        enrollments.push(created);
        return withRelations(created);
      },
      delete: async ({ where }: any) => {
        const idx = enrollments.findIndex((e) => e.id === where.id);
        if (idx === -1) throw new Error('not found');
        enrollments.splice(idx, 1);
      },
    },
  };

  function withRelations(e: any) {
    const course = courses.find((c) => c.id === e.courseId) ?? null;
    const user = users.find((u) => u.id === e.userId) ?? null;
    const assignedBy = e.assignedById ? (users.find((u) => u.id === e.assignedById) ?? null) : null;
    return { ...e, course, user, assignedBy };
  }

  function matchesWhere(e: any, where: any): boolean {
    if (e.organizationId !== where.organizationId) return false;
    if (where.userId && e.userId !== where.userId) return false;
    if (where.courseId && e.courseId !== where.courseId) return false;
    if (where.status && e.status !== where.status) return false;
    if (where.user?.departmentId) {
      const user = users.find((u) => u.id === e.userId);
      const filter = where.user.departmentId;
      if (typeof filter === 'string') {
        if (user?.departmentId !== filter) return false;
      } else if (filter.in) {
        if (!user?.departmentId || !filter.in.includes(user.departmentId)) return false;
      }
    }
    return true;
  }

  return { prisma, enrollments };
}

describe('Enrollments API (security-critical)', () => {
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
      'auth0|priya': ORG_A,
      'auth0|jordan': ORG_A,
      'auth0|riley': ORG_A,
      'auth0|hr': ORG_A,
      'auth0|b-learner': ORG_B,
    };
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

    const usersService = new UsersService(fake.prisma as any);

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [EnrollmentsController],
      providers: [
        EnrollmentsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
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
    fake.enrollments.length = 0;
    fake.enrollments.push(...reseeded.enrollments);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/enrollments/mine');
    expect(res.status).toBe(401);
  });

  it('a Learner self-enrolls in a PUBLISHED + PUBLIC course', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('NOT_STARTED');
    expect(res.body.source).toBe('SELF');
  });

  it('rejects self-enrollment in a DRAFT course', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: DRAFT_COURSE });
    expect(res.status).toBe(400);
  });

  it('rejects self-enrollment in a PRIVATE course', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PRIVATE_COURSE });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate self-enrollment', async () => {
    const token = await tokenFor('auth0|jordan');
    await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    expect(res.status).toBe(409);
  });

  it('an HR/L&D Admin can assign any user to a PUBLISHED course', async () => {
    const token = await tokenFor('auth0|hr');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${token}`)
      .send({ userId: RILEY, courseId: PUBLISHED_PRIVATE_COURSE, isMandatory: true });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('ADMIN');
    expect(res.body.isMandatory).toBe(true);
  });

  it('a Manager can assign a user in a department they manage', async () => {
    const token = await tokenFor('auth0|priya');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${token}`)
      .send({ userId: JORDAN, courseId: PUBLISHED_PRIVATE_COURSE });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('MANAGER');
  });

  it('SECURITY: a Manager CANNOT assign a user outside their managed department', async () => {
    const token = await tokenFor('auth0|priya');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${token}`)
      .send({ userId: RILEY, courseId: PUBLISHED_PRIVATE_COURSE });
    expect(res.status).toBe(403);
  });

  it('a Learner CANNOT list all organization enrollments (no enrollment:manage)', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/enrollments').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("a Manager's list is scoped to their managed department", async () => {
    const hrToken = await tokenFor('auth0|hr');
    await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${hrToken}`)
      .send({ userId: JORDAN, courseId: PUBLISHED_PRIVATE_COURSE });
    await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${hrToken}`)
      .send({ userId: RILEY, courseId: PUBLISHED_PRIVATE_COURSE });

    const managerToken = await tokenFor('auth0|priya');
    const res = await request(app.getHttpServer()).get('/organizations/me/enrollments').set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((e: any) => e.user.id)).toEqual([JORDAN]);
  });

  it('a Learner lists their own enrollments via /mine', async () => {
    const token = await tokenFor('auth0|jordan');
    await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    const res = await request(app.getHttpServer()).get('/organizations/me/enrollments/mine').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('a Learner cancels their own self-created, not-started enrollment', async () => {
    const token = await tokenFor('auth0|jordan');
    const created = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    const res = await request(app.getHttpServer())
      .delete(`/organizations/me/enrollments/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('SECURITY: a Learner CANNOT cancel an admin-assigned enrollment', async () => {
    const hrToken = await tokenFor('auth0|hr');
    const assigned = await request(app.getHttpServer())
      .post('/organizations/me/enrollments').set('Authorization', `Bearer ${hrToken}`)
      .send({ userId: JORDAN, courseId: PUBLISHED_PRIVATE_COURSE, isMandatory: true });

    const learnerToken = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .delete(`/organizations/me/enrollments/${assigned.body.id}`).set('Authorization', `Bearer ${learnerToken}`);
    expect(res.status).toBe(403);
  });

  it('SECURITY: tenant isolation — cannot self-enroll into another organization\'s course', async () => {
    const token = await tokenFor('auth0|b-learner');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${token}`)
      .send({ courseId: PUBLISHED_PUBLIC_COURSE });
    expect(res.status).toBe(404);
  });

  it('SECURITY: 404 fetching an enrollment id belonging to another org', async () => {
    const bToken = await tokenFor('auth0|b-learner');
    await request(app.getHttpServer())
      .post('/organizations/me/enrollments/self').set('Authorization', `Bearer ${bToken}`)
      .send({ courseId: ORG_B_COURSE });

    const [bEnrollment] = fake.enrollments.filter((e) => e.organizationId === ORG_B);
    const aToken = await tokenFor('auth0|hr');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/enrollments/${bEnrollment.id}`).set('Authorization', `Bearer ${aToken}`);
    expect(res.status).toBe(404);
  });
});
