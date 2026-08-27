/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication } from '@nestjs/common';
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
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { CoursesController } from '../courses.controller';
import { CoursesService } from '../courses.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const USER_A1 = '44444444-0000-4000-8000-000000000001';
const USER_B1 = '55555555-0000-4000-8000-000000000001';
const COURSE_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const COURSE_B = 'bbbbbbbb-0000-4000-8000-000000000001';

function seedFixtures() {
  const now = new Date('2026-01-01T00:00:00Z');
  const courses = [
    { id: COURSE_A, organizationId: ORG_A, title: 'Intro to Leadership', description: null, status: 'DRAFT', difficulty: null, durationMinutes: null, learningObjectives: [], visibility: 'PRIVATE', instructorId: null, createdAt: now, updatedAt: now },
    { id: COURSE_B, organizationId: ORG_B, title: 'Sales 101', description: null, status: 'DRAFT', difficulty: null, durationMinutes: null, learningObjectives: [], visibility: 'PRIVATE', instructorId: null, createdAt: now, updatedAt: now },
  ];
  const users = [
    { id: USER_A1, organizationId: ORG_A, firstName: 'Ada', lastName: 'Admin', email: 'admin@org-a.example' },
    { id: USER_B1, organizationId: ORG_B, firstName: 'Bob', lastName: 'BAdmin', email: 'admin@org-b.example' },
  ];
  const memberships = [
    { id: 'm-a1', organizationId: ORG_A, userId: 'auth0|a-trainer', roleId: 'role-trainer' },
    { id: 'm-a2', organizationId: ORG_A, userId: 'auth0|a-learner', roleId: 'role-learner' },
  ];
  const categories: any[] = [];
  return { courses, users, memberships, categories };
}

function createFakePrisma() {
  const roles = [
    { id: 'role-learner', key: RoleKey.LEARNER, permissions: ['course:read'] },
    { id: 'role-trainer', key: RoleKey.TRAINER, permissions: ['course:create', 'course:read', 'course:update', 'course:publish'] },
  ];
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const { courses, users, memberships, categories } = seedFixtures();

  function withRelations(c: any) {
    const instructor = c.instructorId ? users.find((u) => u.id === c.instructorId) ?? null : null;
    const courseCategories = categories.filter((cat) => cat.courseIds.includes(c.id));
    return { ...c, instructor, categories: courseCategories };
  }

  const prisma = {
    membership: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        const role = rolesById.get(m.roleId)!;
        return { ...m, role: { id: role.id, key: role.key, rolePermissions: role.permissions.map((k) => ({ permission: { key: k } })) } };
      },
    },
    user: {
      findFirst: async ({ where }: any) => users.find((u) => u.id === where.id && u.organizationId === where.organizationId) ?? null,
    },
    course: {
      findMany: async ({ where, skip = 0, take }: any) => {
        const filtered = courses.filter((c) => matchesWhere(c, where));
        return filtered.slice(skip, take ? skip + take : undefined).map(withRelations);
      },
      count: async ({ where }: any) => courses.filter((c) => matchesWhere(c, where)).length,
      findFirst: async ({ where }: any) => {
        const c = courses.find((x) => x.id === where.id && x.organizationId === where.organizationId);
        return c ? withRelations(c) : null;
      },
      create: async ({ data }: any) => {
        const now = new Date();
        const created: any = {
          id: `course-${courses.length + 1}`,
          organizationId: data.organizationId,
          title: data.title,
          description: data.description ?? null,
          status: 'DRAFT',
          difficulty: data.difficulty ?? null,
          durationMinutes: data.durationMinutes ?? null,
          learningObjectives: data.learningObjectives ?? [],
          visibility: data.visibility ?? 'PRIVATE',
          instructorId: data.instructorId ?? null,
          createdAt: now,
          updatedAt: now,
        };
        courses.push(created);
        return withRelations(created);
      },
      update: async ({ where, data }: any) => {
        const target = courses.find((c) => c.id === where.id);
        if (!target) throw new Error('not found');
        if (data.title !== undefined) target.title = data.title;
        if (data.status !== undefined) target.status = data.status;
        if (data.instructor) {
          if ('connect' in data.instructor) target.instructorId = data.instructor.connect.id;
          else if ('disconnect' in data.instructor) target.instructorId = null;
        }
        target.updatedAt = new Date();
        return withRelations(target);
      },
    },
    category: {
      findMany: async ({ where }: any) => categories.filter((c) => c.organizationId === where.organizationId),
    },
  };

  function matchesWhere(c: any, where: any): boolean {
    if (c.organizationId !== where.organizationId) return false;
    if (where.status && c.status !== where.status) return false;
    if (where.title?.contains && !c.title.toLowerCase().includes(where.title.contains.toLowerCase())) return false;
    return true;
  }

  return { prisma, courses };
}

describe('Courses API (security-critical)', () => {
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

    const ORG_BY_USER: Record<string, string> = { 'auth0|a-trainer': ORG_A, 'auth0|a-learner': ORG_A };
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
      controllers: [CoursesController],
      providers: [
        CoursesService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
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
    const { ValidationPipe } = await import('@nestjs/common');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  beforeEach(() => {
    const reseeded = createFakePrisma();
    fake.courses.length = 0;
    fake.courses.push(...reseeded.courses);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/courses');
    expect(res.status).toBe(401);
  });

  it('a Learner CAN list courses (course:read)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer()).get('/organizations/me/courses').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('a Learner CANNOT create a course (no course:create)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/courses').set('Authorization', `Bearer ${token}`)
      .send({ title: 'New course' });
    expect(res.status).toBe(403);
  });

  it('SECURITY: lists only the caller\'s organization courses', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer()).get('/organizations/me/courses').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((c: any) => c.title)).not.toContain('Sales 101');
  });

  it('SECURITY: 404 on a course id belonging to another org', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer()).get(`/organizations/me/courses/${COURSE_B}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Sales 101');
  });

  it('a Trainer creates a course, defaulting to DRAFT', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/courses').set('Authorization', `Bearer ${token}`)
      .send({ title: 'Advanced Negotiation', difficulty: 'ADVANCED', durationMinutes: 90, learningObjectives: ['Negotiate well'] });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.difficulty).toBe('ADVANCED');
  });

  it('validates: rejects an empty title', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/courses').set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('SECURITY: rejects an instructor id from another org (400, not 404)', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/courses').set('Authorization', `Bearer ${token}`)
      .send({ title: 'X', instructorId: USER_B1 });
    expect(res.status).toBe(400);
  });

  it('assigns an instructor from the caller\'s org', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .put(`/organizations/me/courses/${COURSE_A}`).set('Authorization', `Bearer ${token}`)
      .send({ instructorId: USER_A1 });
    expect(res.status).toBe(200);
    expect(res.body.instructor.id).toBe(USER_A1);
  });

  it('publishes and archives a course via status transitions', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const publish = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' });
    expect(publish.status).toBe(200);
    expect(publish.body.status).toBe('PUBLISHED');

    const archive = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'ARCHIVED' });
    expect(archive.status).toBe(200);
    expect(archive.body.status).toBe('ARCHIVED');
  });

  it('filters the list by status', async () => {
    const token = await tokenFor('auth0|a-trainer');
    await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' });
    const res = await request(app.getHttpServer())
      .get('/organizations/me/courses').query({ status: 'PUBLISHED' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe('PUBLISHED');
  });
});
