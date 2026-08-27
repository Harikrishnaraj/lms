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
import { CourseModulesController } from '../course-modules.controller';
import { CourseModulesService } from '../course-modules.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const COURSE_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const COURSE_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const MODULE_A1 = 'cccccccc-0000-4000-8000-000000000001';
const MODULE_A2 = 'cccccccc-0000-4000-8000-000000000002';

function seedFixtures() {
  const courses = [
    { id: COURSE_A, organizationId: ORG_A },
    { id: COURSE_B, organizationId: ORG_B },
  ];
  const modules = [
    { id: MODULE_A1, organizationId: ORG_A, courseId: COURSE_A, title: 'Module One', position: 0 },
    { id: MODULE_A2, organizationId: ORG_A, courseId: COURSE_A, title: 'Module Two', position: 1 },
  ];
  return { courses, modules };
}

function createFakePrisma() {
  const roles = [
    { id: 'role-learner', key: RoleKey.LEARNER, permissions: ['course:read'] },
    { id: 'role-trainer', key: RoleKey.TRAINER, permissions: ['course:create', 'course:read', 'course:update', 'course:publish'] },
  ];
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const memberships = [
    { id: 'm-a1', organizationId: ORG_A, userId: 'auth0|a-trainer', roleId: 'role-trainer' },
    { id: 'm-a2', organizationId: ORG_A, userId: 'auth0|a-learner', roleId: 'role-learner' },
  ];
  const { courses, modules } = seedFixtures();

  const prisma = {
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    membership: {
      findUnique: async ({ where }: any) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        const role = rolesById.get(m.roleId)!;
        return { ...m, role: { id: role.id, key: role.key, rolePermissions: role.permissions.map((k) => ({ permission: { key: k } })) } };
      },
    },
    course: {
      findFirst: async ({ where }: any) => courses.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
    },
    module: {
      findMany: async ({ where }: any) =>
        modules.filter((m) => m.organizationId === where.organizationId && m.courseId === where.courseId).sort((a, b) => a.position - b.position),
      findFirst: async ({ where }: any) =>
        modules.find((m) => m.id === where.id && m.organizationId === where.organizationId && m.courseId === where.courseId) ?? null,
      count: async ({ where }: any) => modules.filter((m) => m.organizationId === where.organizationId && m.courseId === where.courseId).length,
      create: async ({ data }: any) => {
        const created = { id: `module-${modules.length + 1}`, organizationId: data.organizationId, courseId: data.courseId, title: data.title, position: data.position };
        modules.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const target = modules.find((m) => m.id === where.id);
        if (!target) throw new Error('not found');
        if (data.title !== undefined) target.title = data.title;
        if (data.position !== undefined) target.position = data.position;
        return target;
      },
    },
  };

  return { prisma, modules };
}

describe('Course Modules API (security-critical)', () => {
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
      controllers: [CourseModulesController],
      providers: [
        CourseModulesService,
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
    fake.modules.length = 0;
    fake.modules.push(...reseeded.modules);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get(`/organizations/me/courses/${COURSE_A}/modules`);
    expect(res.status).toBe(401);
  });

  it('a Learner CAN list modules (course:read)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer()).get(`/organizations/me/courses/${COURSE_A}/modules`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('a Learner CANNOT create a module (no course:update)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'New module' });
    expect(res.status).toBe(403);
  });

  it('SECURITY: 404 on a course id belonging to another org', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer()).get(`/organizations/me/courses/${COURSE_B}/modules`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('a Trainer creates a module, appended to the end', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'Module Three' });
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(2);
  });

  it('validates: rejects an empty title', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules`).set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('renames a module', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .put(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Renamed');
  });

  it('SECURITY: 404 renaming a module id belonging to another course/org', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .put(`/organizations/me/courses/${COURSE_A}/modules/${'dddddddd-0000-4000-8000-000000000099'}`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(404);
  });

  it('reorders modules given the full id set', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/modules/reorder`).set('Authorization', `Bearer ${token}`)
      .send({ moduleIds: [MODULE_A2, MODULE_A1] });
    expect(res.status).toBe(200);
    expect(res.body.map((m: any) => m.id)).toEqual([MODULE_A2, MODULE_A1]);
  });

  it('rejects a reorder with a mismatched id set', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/modules/reorder`).set('Authorization', `Bearer ${token}`)
      .send({ moduleIds: [MODULE_A1] });
    expect(res.status).toBe(400);
  });
});
