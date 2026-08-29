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
import { STORAGE_PORT } from '../../storage/storage.port';
import { TenantContextInterceptor } from '../../tenancy/tenant-context.interceptor';
import { TenantContextStorage } from '../../tenancy/tenant-context.storage';
import { UsersService } from '../../users/users.service';
import { PlayerController } from '../player.controller';
import { PlayerService } from '../player.service';
import { CertificatesService } from '../../certificates/certificates.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000011'; // LEARNER, owns ENROLLMENT_1
const RILEY = 'aaaaaaaa-0000-4000-8000-000000000022'; // LEARNER, unrelated to ENROLLMENT_1
const HR_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000033'; // HR_LD_ADMIN, enrollment:manage
const ORG_B_LEARNER = 'bbbbbbbb-0000-4000-8000-000000000001';

const COURSE_1 = 'cccccccc-0000-4000-8000-000000000001';
const MODULE_1 = 'dddddddd-0000-4000-8000-000000000001';
const CONTENT_TEXT = 'eeeeeeee-0000-4000-8000-000000000001';
const CONTENT_VIDEO = 'eeeeeeee-0000-4000-8000-000000000002';
const ENROLLMENT_1 = 'ffffffff-0000-4000-8000-000000000001';

function seedFixtures() {
  const users = [
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: null },
    { id: RILEY, organizationId: ORG_A, externalId: 'auth0|riley', firstName: 'Riley', lastName: 'Diaz', email: 'riley@org-a.example', departmentId: null },
    { id: HR_ADMIN, organizationId: ORG_A, externalId: 'auth0|hr', firstName: 'Hana', lastName: 'Admin', email: 'hana@org-a.example', departmentId: null },
    { id: ORG_B_LEARNER, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', departmentId: null },
  ];
  const courses = [{ id: COURSE_1, organizationId: ORG_A, title: 'Workplace Safety' }];
  const modules = [{ id: MODULE_1, organizationId: ORG_A, courseId: COURSE_1, title: 'Getting started', position: 0 }];
  const contentItems = [
    { id: CONTENT_TEXT, organizationId: ORG_A, moduleId: MODULE_1, title: 'Welcome', type: 'TEXT', position: 0, status: 'ACTIVE', storageKey: null, textBody: 'Read me first.' },
    { id: CONTENT_VIDEO, organizationId: ORG_A, moduleId: MODULE_1, title: 'Safety video', type: 'VIDEO', position: 1, status: 'ACTIVE', storageKey: 'org/course/video.mp4', textBody: null },
  ];
  const enrollments = [
    { id: ENROLLMENT_1, organizationId: ORG_A, userId: JORDAN, courseId: COURSE_1, status: 'NOT_STARTED', isMandatory: false, source: 'SELF', assignedById: null, dueDate: null, startedAt: null, completedAt: null },
  ];
  const contentProgress: any[] = [];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|riley', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|hr', roleKey: RoleKey.HR_LD_ADMIN },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, modules, contentItems, enrollments, contentProgress, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  HR_LD_ADMIN: ['course:read', 'enrollment:manage', 'user:view', 'user:manage'],
};

function createFakePrisma() {
  const { users, courses, modules, contentItems, enrollments, contentProgress, memberships } = seedFixtures();

  function withEnrollmentRelations(e: any) {
    const course = courses.find((c) => c.id === e.courseId) ?? null;
    const user = users.find((u) => u.id === e.userId) ?? null;
    return { ...e, course, user, assignedBy: null };
  }

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
      findMany: async () => [],
    },
    enrollment: {
      findFirst: async ({ where }: any) => {
        const e = enrollments.find((x) => x.id === where.id && x.organizationId === where.organizationId);
        return e ? withEnrollmentRelations(e) : null;
      },
      update: async ({ where, data }: any) => {
        const e = enrollments.find((x) => x.id === where.id);
        if (!e) throw new Error('not found');
        Object.assign(e, data);
        return withEnrollmentRelations(e);
      },
    },
    module: {
      findMany: async ({ where }: any) => {
        const mods = modules
          .filter((m) => m.organizationId === where.organizationId && m.courseId === where.courseId)
          .sort((a, b) => a.position - b.position);
        return mods.map((m) => ({
          ...m,
          contentItems: contentItems
            .filter((ci) => ci.moduleId === m.id && ci.status === 'ACTIVE')
            .sort((a, b) => a.position - b.position),
        }));
      },
    },
    contentItem: {
      findFirst: async ({ where }: any) => {
        const courseId = where.module.courseId;
        return (
          contentItems.find(
            (ci) => ci.id === where.id && ci.organizationId === where.organizationId && modules.some((m) => m.id === ci.moduleId && m.courseId === courseId),
          ) ?? null
        );
      },
      count: async ({ where }: any) => {
        const courseId = where.module.courseId;
        return contentItems.filter(
          (ci) => ci.organizationId === where.organizationId && ci.status === where.status && modules.some((m) => m.id === ci.moduleId && m.courseId === courseId),
        ).length;
      },
    },
    contentProgress: {
      findMany: async ({ where }: any) =>
        contentProgress.filter((p) => p.organizationId === where.organizationId && p.enrollmentId === where.enrollmentId),
      count: async ({ where }: any) =>
        contentProgress.filter((p) => p.enrollmentId === where.enrollmentId && p.status === where.status).length,
      upsert: async ({ where, update, create }: any) => {
        const key = where.enrollmentId_contentItemId;
        const existing = contentProgress.find((p) => p.enrollmentId === key.enrollmentId && p.contentItemId === key.contentItemId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const created = { organizationId: create.organizationId, enrollmentId: create.enrollmentId, contentItemId: create.contentItemId, status: create.status, lastAccessedAt: create.lastAccessedAt, completedAt: create.completedAt };
        contentProgress.push(created);
        return created;
      },
    },
  };

  return { prisma, enrollments, contentProgress };
}

const fakeStorage = { getDownloadUrl: async (key: string) => `https://storage.test/${key}` };

describe('Course Player API (security-critical)', () => {
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
      controllers: [PlayerController],
      providers: [
        PlayerService,
        EnrollmentsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: UsersService, useValue: usersService },
        { provide: PRISMA_CLIENT, useValue: fake.prisma },
        { provide: STORAGE_PORT, useValue: fakeStorage },
        { provide: ConfigService, useValue: fakeConfigService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: AuthorizationGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
        {
          provide: CertificatesService,
          useValue: {
            issueForCompletedEnrollment: async () => null,
          },
        },
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
    fake.contentProgress.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get(`/organizations/me/enrollments/${ENROLLMENT_1}/player`);
    expect(res.status).toBe(401);
  });

  it('returns the course structure with NOT_STARTED progress and a resume pointer at the first item', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/enrollments/${ENROLLMENT_1}/player`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.enrollment.status).toBe('NOT_STARTED');
    expect(res.body.modules).toHaveLength(1);
    expect(res.body.modules[0].contentItems).toHaveLength(2);
    expect(res.body.modules[0].contentItems[0].status).toBe('NOT_STARTED');
    expect(res.body.modules[0].contentItems[0].textBody).toBe('Read me first.');
    expect(res.body.modules[0].contentItems[1].playbackUrl).toBe('https://storage.test/org/course/video.mp4');
    expect(res.body.resumeContentItemId).toBe(CONTENT_TEXT);
  });

  it('a learner who does not own the enrollment cannot view its player', async () => {
    const token = await tokenFor('auth0|riley');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/enrollments/${ENROLLMENT_1}/player`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('a user in a different organization gets a 404, not a 403 (cross-tenant isolation)', async () => {
    const token = await tokenFor('auth0|b-learner');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/enrollments/${ENROLLMENT_1}/player`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('staff with enrollment:manage can view a learner\'s player', async () => {
    const token = await tokenFor('auth0|hr');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/enrollments/${ENROLLMENT_1}/player`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('marking the first item complete moves the enrollment to IN_PROGRESS, and completing both finishes it', async () => {
    const token = await tokenFor('auth0|jordan');

    const first = await request(app.getHttpServer())
      .post(`/organizations/me/enrollments/${ENROLLMENT_1}/content/${CONTENT_TEXT}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });
    expect(first.status).toBe(201);
    expect(first.body.enrollment.status).toBe('IN_PROGRESS');
    expect(first.body.enrollment.startedAt).not.toBeNull();
    expect(first.body.resumeContentItemId).toBe(CONTENT_VIDEO);

    const second = await request(app.getHttpServer())
      .post(`/organizations/me/enrollments/${ENROLLMENT_1}/content/${CONTENT_VIDEO}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });
    expect(second.status).toBe(201);
    expect(second.body.enrollment.status).toBe('COMPLETED');
    expect(second.body.enrollment.completedAt).not.toBeNull();
    expect(second.body.resumeContentItemId).toBeNull();
  });

  it('rejects an unknown target status', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .post(`/organizations/me/enrollments/${ENROLLMENT_1}/content/${CONTENT_TEXT}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'NOT_STARTED' });
    expect(res.status).toBe(400);
  });
});
