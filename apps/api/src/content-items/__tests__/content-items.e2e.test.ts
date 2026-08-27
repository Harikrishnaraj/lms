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
import { STORAGE_PORT, StoragePort } from '../../storage/storage.port';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { ContentItemsController } from '../content-items.controller';
import { ContentItemsService } from '../content-items.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const COURSE_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const COURSE_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const MODULE_A1 = 'cccccccc-0000-4000-8000-000000000001';
const MODULE_B1 = 'cccccccc-0000-4000-8000-000000000099';
const CONTENT_A1 = 'eeeeeeee-0000-4000-8000-000000000001';
const CONTENT_A2 = 'eeeeeeee-0000-4000-8000-000000000002';

function seedFixtures() {
  const courses = [
    { id: COURSE_A, organizationId: ORG_A },
    { id: COURSE_B, organizationId: ORG_B },
  ];
  const modules = [
    { id: MODULE_A1, organizationId: ORG_A, courseId: COURSE_A },
    { id: MODULE_B1, organizationId: ORG_B, courseId: COURSE_B },
  ];
  const contentItems = [
    { id: CONTENT_A1, organizationId: ORG_A, moduleId: MODULE_A1, title: 'Welcome text', type: 'TEXT', status: 'ACTIVE', position: 0, storageKey: null, textBody: 'Hello' },
    { id: CONTENT_A2, organizationId: ORG_A, moduleId: MODULE_A1, title: 'Intro video', type: 'VIDEO', status: 'ACTIVE', position: 1, storageKey: 'org-a/course-a/vid1', textBody: null },
  ];
  return { courses, modules, contentItems };
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
  const { courses, modules, contentItems } = seedFixtures();

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
      findFirst: async ({ where }: any) =>
        modules.find((m) => m.id === where.id && m.organizationId === where.organizationId && m.courseId === where.courseId) ?? null,
    },
    contentItem: {
      findMany: async ({ where }: any) =>
        contentItems.filter((c) => c.organizationId === where.organizationId && c.moduleId === where.moduleId).sort((a, b) => a.position - b.position),
      findFirst: async ({ where }: any) =>
        contentItems.find((c) => c.id === where.id && c.organizationId === where.organizationId && c.moduleId === where.moduleId) ?? null,
      count: async ({ where }: any) => contentItems.filter((c) => c.organizationId === where.organizationId && c.moduleId === where.moduleId).length,
      create: async ({ data }: any) => {
        const created = {
          id: `content-${contentItems.length + 1}`,
          organizationId: data.organizationId,
          moduleId: data.moduleId,
          title: data.title,
          type: data.type,
          status: 'ACTIVE',
          position: data.position,
          storageKey: data.storageKey ?? null,
          textBody: data.textBody ?? null,
        };
        contentItems.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const target = contentItems.find((c) => c.id === where.id);
        if (!target) throw new Error('not found');
        if (data.title !== undefined) target.title = data.title;
        if (data.status !== undefined) target.status = data.status;
        if (data.position !== undefined) target.position = data.position;
        if (data.storageKey !== undefined) target.storageKey = data.storageKey;
        if (data.textBody !== undefined) target.textBody = data.textBody;
        return target;
      },
    },
  };

  return { prisma, contentItems };
}

function createFakeStorage(): StoragePort {
  return {
    createUploadTarget: async (key: string) => ({ key, uploadUrl: `https://storage.test/${key}`, headers: {} }),
    getDownloadUrl: async (key: string) => `https://storage.test/${key}?download=1`,
    deleteObject: async () => {},
  };
}

describe('Content Items API (security-critical)', () => {
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
      controllers: [ContentItemsController],
      providers: [
        ContentItemsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: PRISMA_CLIENT, useValue: fake.prisma },
        { provide: STORAGE_PORT, useValue: createFakeStorage() },
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
    fake.contentItems.length = 0;
    fake.contentItems.push(...reseeded.contentItems);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`);
    expect(res.status).toBe(401);
  });

  it('a Learner CAN list content items (course:read)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('a Learner CANNOT create a content item (no course:update)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'New', type: 'TEXT', textBody: 'Body' });
    expect(res.status).toBe(403);
  });

  it('SECURITY: 404 on a module id belonging to another org', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_B1}/content`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('creates a TEXT content item with a textBody', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'New text', type: 'TEXT', textBody: 'Body content' });
    expect(res.status).toBe(201);
    expect(res.body.textBody).toBe('Body content');
  });

  it('validates: a VIDEO content item requires a storageKey', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'New video', type: 'VIDEO' });
    expect(res.status).toBe(400);
  });

  it('validates: a TEXT content item requires a textBody', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content`).set('Authorization', `Bearer ${token}`)
      .send({ title: 'New text', type: 'TEXT' });
    expect(res.status).toBe(400);
  });

  it('gets an upload target for a course asset', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/courses/${COURSE_A}/uploads`).set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'video/mp4' });
    expect(res.status).toBe(201);
    expect(res.body.key).toContain(`${ORG_A}/${COURSE_A}/`);
    expect(res.body.uploadUrl).toBeDefined();
  });

  it('resolves a download URL for a stored content item', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content/${CONTENT_A2}/download-url`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('download=1');
  });

  it('rejects a download URL request for content with no stored file', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content/${CONTENT_A1}/download-url`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('archives a content item via status transition', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content/${CONTENT_A1}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'ARCHIVED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');
  });

  it('reorders content items given the full id set', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content/reorder`).set('Authorization', `Bearer ${token}`)
      .send({ contentItemIds: [CONTENT_A2, CONTENT_A1] });
    expect(res.status).toBe(200);
    expect(res.body.map((c: any) => c.id)).toEqual([CONTENT_A2, CONTENT_A1]);
  });

  it('rejects a reorder with a mismatched id set', async () => {
    const token = await tokenFor('auth0|a-trainer');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/courses/${COURSE_A}/modules/${MODULE_A1}/content/reorder`).set('Authorization', `Bearer ${token}`)
      .send({ contentItemIds: [CONTENT_A1] });
    expect(res.status).toBe(400);
  });
});
