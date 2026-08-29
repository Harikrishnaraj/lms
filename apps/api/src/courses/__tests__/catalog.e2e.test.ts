/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
import { CatalogController } from '../catalog.controller';
import { CoursesService } from '../courses.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const JORDAN = 'aaaaaaaa-0000-4000-8000-0000000000j1';

const PUBLISHED_PUBLIC_1 = 'cccccccc-0000-4000-8000-000000000001'; // "Workplace Safety", Compliance, BEGINNER, 30min
const PUBLISHED_PUBLIC_2 = 'cccccccc-0000-4000-8000-000000000002'; // "Advanced Negotiation", Sales, ADVANCED, 90min
const DRAFT_PUBLIC = 'cccccccc-0000-4000-8000-000000000003';
const PUBLISHED_PRIVATE = 'cccccccc-0000-4000-8000-000000000004';
const ORG_B_PUBLISHED_PUBLIC = 'cccccccc-0000-4000-8000-0000000000b1';

function seedFixtures() {
  const users = [
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: null },
  ];
  const courses = [
    { id: PUBLISHED_PUBLIC_1, organizationId: ORG_A, title: 'Workplace Safety', status: 'PUBLISHED', visibility: 'PUBLIC', difficulty: 'BEGINNER', durationMinutes: 30, instructorId: null, categoryNames: ['Compliance'] },
    { id: PUBLISHED_PUBLIC_2, organizationId: ORG_A, title: 'Advanced Negotiation', status: 'PUBLISHED', visibility: 'PUBLIC', difficulty: 'ADVANCED', durationMinutes: 90, instructorId: null, categoryNames: ['Sales'] },
    { id: DRAFT_PUBLIC, organizationId: ORG_A, title: 'Unfinished Course', status: 'DRAFT', visibility: 'PUBLIC', difficulty: null, durationMinutes: null, instructorId: null, categoryNames: [] },
    { id: PUBLISHED_PRIVATE, organizationId: ORG_A, title: 'Leadership Track', status: 'PUBLISHED', visibility: 'PRIVATE', difficulty: null, durationMinutes: null, instructorId: null, categoryNames: [] },
    { id: ORG_B_PUBLISHED_PUBLIC, organizationId: ORG_B, title: 'Sales 101 (Org B)', status: 'PUBLISHED', visibility: 'PUBLIC', difficulty: null, durationMinutes: null, instructorId: null, categoryNames: [] },
  ];
  const memberships = [{ organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER }];
  const enrollments = [
    { id: 'enr-1', organizationId: ORG_A, userId: JORDAN, courseId: PUBLISHED_PUBLIC_1, status: 'IN_PROGRESS', isMandatory: false, dueDate: null },
  ];
  return { users, courses, memberships, enrollments };
}

const ROLE_PERMISSIONS: Record<string, string[]> = { LEARNER: ['course:read'] };

function createFakePrisma() {
  const { users, courses, memberships, enrollments } = seedFixtures();

  function withRelations(c: any) {
    return {
      ...c,
      instructor: null,
      categories: c.categoryNames.map((name: string) => ({ id: `cat-${name}`, name })),
    };
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
    course: {
      findMany: async ({ where, skip = 0, take }: any) => {
        const filtered = courses.filter((c) => matchesWhere(c, where));
        return filtered.slice(skip, take ? skip + take : undefined).map(withRelations);
      },
      count: async ({ where }: any) => courses.filter((c) => matchesWhere(c, where)).length,
      findFirst: async ({ where }: any) => {
        const c = courses.find((x) => matchesWhere(x, where) && x.id === where.id);
        return c ? withRelations(c) : null;
      },
    },
    category: {
      findMany: async ({ where }: any) => {
        const names = new Set(courses.filter((c) => c.organizationId === where.organizationId).flatMap((c) => c.categoryNames));
        return Array.from(names).sort().map((name) => ({ id: `cat-${name}`, organizationId: where.organizationId, name }));
      },
    },
    enrollment: {
      findMany: async ({ where }: any) =>
        enrollments.filter(
          (e) => e.organizationId === where.organizationId && e.userId === where.userId && where.courseId.in.includes(e.courseId),
        ),
    },
  };

  function matchesWhere(c: any, where: any): boolean {
    if (c.organizationId !== where.organizationId) return false;
    if (where.status && c.status !== where.status) return false;
    if (where.visibility && c.visibility !== where.visibility) return false;
    if (where.title?.contains && !c.title.toLowerCase().includes(where.title.contains.toLowerCase())) return false;
    if (where.difficulty && c.difficulty !== where.difficulty) return false;
    if (where.categories?.some?.name && !c.categoryNames.includes(where.categories.some.name)) return false;
    if (where.durationMinutes) {
      const d = c.durationMinutes;
      if (where.durationMinutes.gte !== undefined && (d === null || d < where.durationMinutes.gte)) return false;
      if (where.durationMinutes.lte !== undefined && (d === null || d > where.durationMinutes.lte)) return false;
    }
    return true;
  }

  return { prisma, courses };
}

describe('Learner Catalog API (Task 13)', () => {
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

    const ORG_BY_USER: Record<string, string> = { 'auth0|jordan': ORG_A };
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
      controllers: [CatalogController],
      providers: [
        CoursesService,
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

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/catalog');
    expect(res.status).toBe(401);
  });

  it('only returns PUBLISHED + PUBLIC courses', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/catalog').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const titles = res.body.items.map((c: any) => c.title);
    expect(titles).toContain('Workplace Safety');
    expect(titles).toContain('Advanced Negotiation');
    expect(titles).not.toContain('Unfinished Course');
    expect(titles).not.toContain('Leadership Track');
  });

  it('SECURITY: does not leak another organization\'s public courses', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/catalog').set('Authorization', `Bearer ${token}`);
    expect(res.body.items.map((c: any) => c.title)).not.toContain('Sales 101 (Org B)');
  });

  it('filters by category', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/catalog').query({ category: 'Compliance' }).set('Authorization', `Bearer ${token}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Workplace Safety');
  });

  it('filters by difficulty', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/catalog').query({ difficulty: 'ADVANCED' }).set('Authorization', `Bearer ${token}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Advanced Negotiation');
  });

  it('filters by duration range', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/catalog').query({ maxDurationMinutes: 60 }).set('Authorization', `Bearer ${token}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Workplace Safety');
  });

  it('searches by title', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/catalog').query({ search: 'negotiation' }).set('Authorization', `Bearer ${token}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Advanced Negotiation');
  });

  it("merges the caller's enrollment status onto each course", async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer()).get('/organizations/me/catalog').set('Authorization', `Bearer ${token}`);
    const safety = res.body.items.find((c: any) => c.title === 'Workplace Safety');
    const negotiation = res.body.items.find((c: any) => c.title === 'Advanced Negotiation');
    expect(safety.enrollmentStatus).toBe('IN_PROGRESS');
    expect(negotiation.enrollmentStatus).toBe('NOT_ENROLLED');
  });

  it('404s fetching a DRAFT course by id', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/catalog/${DRAFT_PUBLIC}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('404s fetching a PRIVATE course by id', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/catalog/${PUBLISHED_PRIVATE}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('retrieves a PUBLISHED + PUBLIC course by id with enrollment status', async () => {
    const token = await tokenFor('auth0|jordan');
    const res = await request(app.getHttpServer())
      .get(`/organizations/me/catalog/${PUBLISHED_PUBLIC_1}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.enrollmentStatus).toBe('IN_PROGRESS');
  });
});
