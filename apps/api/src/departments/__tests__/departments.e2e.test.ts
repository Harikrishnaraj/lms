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
import { DepartmentsController } from '../departments.controller';
import { DepartmentsService } from '../departments.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
// @IsUUID() (class-validator, used on request bodies) enforces RFC4122
// version/variant nibbles, unlike Nest's ParseUUIDPipe on path params — so
// ids sent in a body must actually look like v4 UUIDs.
const USER_A1 = '44444444-0000-4000-8000-000000000001';
const USER_B1 = '55555555-0000-4000-8000-000000000001';
const DEPT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEPT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

interface FakeDepartment {
  id: string;
  organizationId: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
interface FakeUser {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
}

function seedFixtures() {
  const now = new Date('2026-01-01T00:00:00Z');
  const departments: FakeDepartment[] = [
    { id: DEPT_A, organizationId: ORG_A, name: 'Engineering', status: 'ACTIVE', managerId: null, createdAt: now, updatedAt: now },
    { id: DEPT_B, organizationId: ORG_B, name: 'Sales', status: 'ACTIVE', managerId: null, createdAt: now, updatedAt: now },
  ];
  const users: FakeUser[] = [
    { id: USER_A1, organizationId: ORG_A, firstName: 'Ada', lastName: 'Admin', email: 'admin@org-a.example' },
    { id: USER_B1, organizationId: ORG_B, firstName: 'Bob', lastName: 'BAdmin', email: 'admin@org-b.example' },
  ];
  const memberships = [
    { id: 'm-a1', organizationId: ORG_A, userId: 'auth0|a-admin', roleId: 'role-org-admin' },
    { id: 'm-a2', organizationId: ORG_A, userId: 'auth0|a-learner', roleId: 'role-learner' },
  ];
  return { departments, users, memberships };
}

function createFakePrisma() {
  const roles = [
    { id: 'role-learner', key: RoleKey.LEARNER, permissions: [] },
    { id: 'role-org-admin', key: RoleKey.ORGANIZATION_ADMIN, permissions: ['user:view', 'user:manage'] },
  ];
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const { departments, users, memberships } = seedFixtures();

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
    department: {
      findMany: async ({ where }: any) => {
        return departments
          .filter((d) => d.organizationId === where.organizationId && (where.status ? d.status === where.status : true))
          .map(withRelations);
      },
      findFirst: async ({ where }: any) => {
        const d = departments.find((x) => x.id === where.id && x.organizationId === where.organizationId);
        return d ? withRelations(d) : null;
      },
      create: async ({ data }: any) => {
        if (departments.some((d) => d.organizationId === data.organizationId && d.name === data.name)) {
          const err = new Error('unique') as Error & { code?: string };
          err.code = 'P2002';
          throw err;
        }
        const now = new Date();
        const created: FakeDepartment = {
          id: `dept-${departments.length + 1}`,
          organizationId: data.organizationId,
          name: data.name,
          status: 'ACTIVE',
          managerId: data.managerId ?? null,
          createdAt: now,
          updatedAt: now,
        };
        departments.push(created);
        return withRelations(created);
      },
      update: async ({ where, data }: any) => {
        const target = departments.find((d) => d.id === where.id);
        if (!target) throw new Error('not found');
        if (data.name !== undefined) target.name = data.name;
        if (data.status !== undefined) target.status = data.status;
        if (data.manager) {
          if ('connect' in data.manager) target.managerId = data.manager.connect.id;
          else if ('disconnect' in data.manager) target.managerId = null;
        }
        target.updatedAt = new Date();
        return withRelations(target);
      },
    },
  };

  function withRelations(d: FakeDepartment) {
    const manager = d.managerId ? users.find((u) => u.id === d.managerId) ?? null : null;
    return { ...d, manager, _count: { users: 0 } };
  }

  return { prisma, departments };
}

describe('Departments API (security-critical)', () => {
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

    const ORG_BY_USER: Record<string, string> = { 'auth0|a-admin': ORG_A, 'auth0|a-learner': ORG_A };
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
      controllers: [DepartmentsController],
      providers: [
        DepartmentsService,
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
    fake.departments.length = 0;
    fake.departments.push(...reseeded.departments);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/departments');
    expect(res.status).toBe(401);
  });

  it('denies a Learner (no user:view)', async () => {
    const token = await tokenFor('auth0|a-learner');
    const res = await request(app.getHttpServer()).get('/organizations/me/departments').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('lists departments for the caller\'s org only', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer()).get('/organizations/me/departments').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Engineering');
  });

  it('SECURITY: 404 on a department id belonging to another org', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer()).get(`/organizations/me/departments/${DEPT_B}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Sales');
  });

  it('creates a department', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/departments').set('Authorization', `Bearer ${token}`)
      .send({ name: 'People Ops' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('People Ops');
    expect(res.body.status).toBe('ACTIVE');
  });

  it('assigns a manager from the caller\'s org', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer())
      .put(`/organizations/me/departments/${DEPT_A}`).set('Authorization', `Bearer ${token}`)
      .send({ managerId: USER_A1 });
    expect(res.status).toBe(200);
    expect(res.body.manager.id).toBe(USER_A1);
  });

  it('SECURITY: rejects a manager id from another org (400, not 404)', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer())
      .put(`/organizations/me/departments/${DEPT_A}`).set('Authorization', `Bearer ${token}`)
      .send({ managerId: USER_B1 });
    expect(res.status).toBe(400);
  });

  it('archives a department', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer())
      .patch(`/organizations/me/departments/${DEPT_A}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'ARCHIVED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');

    const list = await request(app.getHttpServer()).get('/organizations/me/departments').set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(0);

    const withArchived = await request(app.getHttpServer())
      .get('/organizations/me/departments').query({ includeArchived: 'true' }).set('Authorization', `Bearer ${token}`);
    expect(withArchived.body).toHaveLength(1);
  });

  it('validates: rejects an empty name', async () => {
    const token = await tokenFor('auth0|a-admin');
    const res = await request(app.getHttpServer())
      .post('/organizations/me/departments').set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});
