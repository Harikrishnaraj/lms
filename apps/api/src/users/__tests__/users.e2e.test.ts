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
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const DEPT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEPT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

interface FakeUser {
  id: string;
  organizationId: string;
  externalId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departmentId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  createdAt: Date;
  updatedAt: Date;
}
interface FakeDepartment {
  id: string;
  organizationId: string;
  name: string;
}
interface FakeMembership {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
}

function seedFixtures() {
  const now = new Date('2026-01-01T00:00:00Z');
  const departments: FakeDepartment[] = [
    { id: DEPT_A, organizationId: ORG_A, name: 'Engineering' },
    { id: DEPT_B, organizationId: ORG_B, name: 'Sales' },
  ];
  const users: FakeUser[] = [
    { id: '44444444-0000-0000-0000-000000000001', organizationId: ORG_A, externalId: 'auth0|a-admin', email: 'admin@org-a.example', firstName: 'Ada', lastName: 'Admin', jobTitle: 'Head', departmentId: DEPT_A, status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: '44444444-0000-0000-0000-000000000002', organizationId: ORG_A, externalId: 'auth0|a-learner', email: 'lisa@org-a.example', firstName: 'Lisa', lastName: 'Learner', jobTitle: 'Analyst', departmentId: DEPT_A, status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: '44444444-0000-0000-0000-000000000003', organizationId: ORG_A, externalId: 'auth0|a-inactive', email: 'ivan@org-a.example', firstName: 'Ivan', lastName: 'Inactive', jobTitle: null, departmentId: null, status: 'INACTIVE', createdAt: now, updatedAt: now },
    { id: '55555555-0000-0000-0000-000000000001', organizationId: ORG_B, externalId: 'auth0|b-admin', email: 'admin@org-b.example', firstName: 'Bob', lastName: 'BAdmin', jobTitle: 'Head', departmentId: DEPT_B, status: 'ACTIVE', createdAt: now, updatedAt: now },
  ];
  const memberships: FakeMembership[] = [
    { id: 'm-a1', organizationId: ORG_A, userId: 'auth0|a-admin', roleId: 'role-org-admin' },
    { id: 'm-a2', organizationId: ORG_A, userId: 'auth0|a-learner', roleId: 'role-learner' },
    { id: 'm-b1', organizationId: ORG_B, userId: 'auth0|b-admin', roleId: 'role-org-admin' },
  ];
  return { departments, users, memberships };
}

function createFakePrisma() {
  const roles = [
    { id: 'role-learner', key: RoleKey.LEARNER, permissions: ['course:read'] },
    { id: 'role-trainer', key: RoleKey.TRAINER, permissions: [] },
    { id: 'role-manager', key: RoleKey.MANAGER, permissions: ['user:view'] },
    { id: 'role-hr', key: RoleKey.HR_LD_ADMIN, permissions: ['user:view', 'user:manage'] },
    { id: 'role-org-admin', key: RoleKey.ORGANIZATION_ADMIN, permissions: ['user:view', 'user:manage'] },
  ];
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const rolesByKey = new Map(roles.map((r) => [r.key, r]));
  const { departments, users, memberships } = seedFixtures();

  const prisma = {
    role: {
      findUniqueOrThrow: async ({ where }: { where: { key: RoleKey } }) => {
        const role = rolesByKey.get(where.key);
        if (!role) throw new Error(`Role not found: ${where.key}`);
        return { id: role.id, key: role.key };
      },
    },
    department: {
      findFirst: async ({ where }: { where: { id: string; organizationId: string } }) => {
        return departments.find((d) => d.id === where.id && d.organizationId === where.organizationId) ?? null;
      },
    },
    membership: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const { organizationId, userId } = where.organizationId_userId;
        const m = memberships.find((x) => x.organizationId === organizationId && x.userId === userId);
        if (!m) return null;
        const role = rolesById.get(m.roleId)!;
        return {
          ...m,
          role: { id: role.id, key: role.key, rolePermissions: role.permissions.map((k) => ({ permission: { key: k } })) },
        };
      },
      findMany: async ({ where, include }: { where: { organizationId?: string; userId?: { in: string[] }; role?: { key: RoleKey } }; include?: { role?: boolean } }) => {
        const filtered = memberships.filter((m) => {
          if (where.organizationId && m.organizationId !== where.organizationId) return false;
          if (where.userId?.in && !where.userId.in.includes(m.userId)) return false;
          if (where.role?.key && rolesById.get(m.roleId)!.key !== where.role.key) return false;
          return true;
        });
        if (include?.role) {
          return filtered.map((m) => ({ ...m, role: rolesById.get(m.roleId)! }));
        }
        return filtered;
      },
      upsert: async ({ where, update, create }: { where: { organizationId_userId: { organizationId: string; userId: string } }; update: { roleId: string }; create: FakeMembership }) => {
        const { organizationId, userId } = where.organizationId_userId;
        const existing = memberships.find((m) => m.organizationId === organizationId && m.userId === userId);
        if (existing) { existing.roleId = update.roleId; return existing; }
        const created = { ...create, id: `m-${memberships.length + 1}` };
        memberships.push(created);
        return created;
      },
      deleteMany: async ({ where }: { where: { organizationId: string; userId: string } }) => {
        const before = memberships.length;
        const kept = memberships.filter((m) => !(m.organizationId === where.organizationId && m.userId === where.userId));
        memberships.length = 0;
        memberships.push(...kept);
        return { count: before - kept.length };
      },
    },
    user: {
      findFirst: async ({ where, include }: { where: { id?: string; organizationId: string; email?: string }; include?: { department?: boolean } }) => {
        const found = users.find((u) => {
          if (u.organizationId !== where.organizationId) return false;
          if (where.id && u.id !== where.id) return false;
          if (where.email && u.email !== where.email) return false;
          return true;
        });
        if (!found) return null;
        if (include?.department) {
          return { ...found, department: departments.find((d) => d.id === found.departmentId) ?? null };
        }
        return found;
      },
      findMany: async ({ where, include, skip = 0, take }: any) => {
        const filtered = users.filter((u) => matchesUserWhere(u, where));
        const sorted = [...filtered].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
        const paged = sorted.slice(skip, take ? skip + take : undefined);
        if (include?.department) {
          return paged.map((u) => ({ ...u, department: departments.find((d) => d.id === u.departmentId) ?? null }));
        }
        return paged;
      },
      count: async ({ where }: any) => users.filter((u) => matchesUserWhere(u, where)).length,
      create: async ({ data, include }: any) => {
        if (users.some((u) => u.organizationId === data.organizationId && u.email === data.email)) {
          const err = new Error('unique') as Error & { code?: string };
          err.code = 'P2002';
          throw err;
        }
        const now = new Date();
        const created: FakeUser = {
          id: `44444444-0000-0000-0000-${String(100 + users.length).padStart(12, '0')}`,
          organizationId: data.organizationId,
          externalId: data.externalId ?? null,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          jobTitle: data.jobTitle ?? null,
          departmentId: data.departmentId ?? null,
          status: data.status ?? 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        };
        users.push(created);
        if (include?.department) {
          return { ...created, department: departments.find((d) => d.id === created.departmentId) ?? null };
        }
        return created;
      },
      update: async ({ where, data, include }: any) => {
        const target = users.find((u) => u.id === where.id);
        if (!target) throw new Error('not found');
        if (data.firstName !== undefined) target.firstName = data.firstName;
        if (data.lastName !== undefined) target.lastName = data.lastName;
        if (data.jobTitle !== undefined) target.jobTitle = data.jobTitle;
        if (data.status !== undefined) target.status = data.status;
        if (data.department) {
          if ('connect' in data.department) target.departmentId = data.department.connect.id;
          else if ('disconnect' in data.department) target.departmentId = null;
        }
        target.updatedAt = new Date();
        if (include?.department) {
          return { ...target, department: departments.find((d) => d.id === target.departmentId) ?? null };
        }
        return target;
      },
    },
  };

  return { prisma, users, departments, memberships };
}

function matchesUserWhere(u: FakeUser, where: any): boolean {
  if (u.organizationId !== where.organizationId) return false;
  if (where.status && u.status !== where.status) return false;
  if (where.departmentId && u.departmentId !== where.departmentId) return false;
  if (where.externalId?.in && (!u.externalId || !where.externalId.in.includes(u.externalId))) return false;
  if (where.OR) {
    const s = (where.OR[0].firstName ?? where.OR[0].lastName ?? where.OR[0].email).contains.toLowerCase();
    if (
      !u.firstName.toLowerCase().includes(s) &&
      !u.lastName.toLowerCase().includes(s) &&
      !u.email.toLowerCase().includes(s)
    ) return false;
  }
  return true;
}

describe('Users API (security-critical)', () => {
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
      'auth0|a-admin': ORG_A,
      'auth0|a-learner': ORG_A,
      'auth0|b-admin': ORG_B,
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

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [UsersController],
      providers: [
        UsersService,
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
    // reseed each test to keep them independent
    const reseeded = createFakePrisma();
    fake.users.length = 0;
    fake.users.push(...reseeded.users);
    fake.departments.length = 0;
    fake.departments.push(...reseeded.departments);
    fake.memberships.length = 0;
    fake.memberships.push(...reseeded.memberships);
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  describe('GET /organizations/me/users', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app.getHttpServer()).get('/organizations/me/users');
      expect(res.status).toBe(401);
    });

    it('denies a Learner (no user:view)', async () => {
      const token = await tokenFor('auth0|a-learner');
      const res = await request(app.getHttpServer()).get('/organizations/me/users').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('lists users for the caller\'s org with pagination metadata', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer()).get('/organizations/me/users').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(25);
      expect(res.body.items).toHaveLength(3);
      expect(res.body.items.map((u: any) => u.email)).toEqual(
        expect.arrayContaining(['admin@org-a.example', 'lisa@org-a.example', 'ivan@org-a.example']),
      );
    });

    it('SECURITY: never returns another organization\'s users in the list', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer()).get('/organizations/me/users').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const emails = res.body.items.map((u: any) => u.email);
      expect(emails).not.toContain('admin@org-b.example');
    });

    it('supports free-text search on first name / last name / email', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users')
        .query({ search: 'lisa' })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].email).toBe('lisa@org-a.example');
    });

    it('filters by status', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users').query({ status: 'INACTIVE' }).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('INACTIVE');
    });

    it('filters by role via Membership', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users').query({ role: RoleKey.LEARNER }).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].externalId).toBe('auth0|a-learner');
      expect(res.body.items[0].role).toBe(RoleKey.LEARNER);
    });

    it('paginates', async () => {
      const token = await tokenFor('auth0|a-admin');
      const page1 = await request(app.getHttpServer())
        .get('/organizations/me/users').query({ pageSize: 2, page: 1 }).set('Authorization', `Bearer ${token}`);
      const page2 = await request(app.getHttpServer())
        .get('/organizations/me/users').query({ pageSize: 2, page: 2 }).set('Authorization', `Bearer ${token}`);
      expect(page1.body.items).toHaveLength(2);
      expect(page2.body.items).toHaveLength(1);
      expect(page1.body.total).toBe(3);
      expect(page2.body.total).toBe(3);
      const overlap = page1.body.items.filter((u: any) => page2.body.items.some((v: any) => v.id === u.id));
      expect(overlap).toHaveLength(0);
    });

    it('rejects invalid pagination values (validation)', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users').query({ pageSize: 500 }).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /organizations/me/users/:id (tenant isolation)', () => {
    it('returns a user in the caller\'s org', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users/44444444-0000-0000-0000-000000000002').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('44444444-0000-0000-0000-000000000002');
    });

    it('SECURITY: 404 on a user id that belongs to another org', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .get('/organizations/me/users/55555555-0000-0000-0000-000000000001').set('Authorization', `Bearer ${token}`);
      // The row exists in ORG_B; the service must return 404 because the
      // caller is scoped to ORG_A.
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('admin@org-b.example');

      // A well-formed UUID that doesn't exist anywhere also returns 404.
      const res2 = await request(app.getHttpServer())
        .get('/organizations/me/users/33333333-3333-3333-3333-333333333333').set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(404);
    });
  });

  describe('POST /organizations/me/users', () => {
    it('creates an ACTIVE user when externalId is provided', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({
          email: 'new@org-a.example',
          firstName: 'New',
          lastName: 'Person',
          externalId: 'auth0|new',
          role: RoleKey.TRAINER,
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.email).toBe('new@org-a.example');
      expect(res.body.role).toBe(RoleKey.TRAINER);
    });

    it('creates an INVITED user when externalId is omitted', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({ email: 'invitee@org-a.example', firstName: 'In', lastName: 'Vited' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('INVITED');
      expect(res.body.externalId).toBeNull();
      expect(res.body.role).toBeNull();
    });

    it('rejects duplicate emails within the same org', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({ email: 'lisa@org-a.example', firstName: 'X', lastName: 'Y', externalId: 'auth0|x' });
      expect(res.status).toBe(409);
    });

    it('validates: rejects an invalid email', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email', firstName: 'X', lastName: 'Y', externalId: 'auth0|x' });
      expect(res.status).toBe(400);
    });

    it('SECURITY: a department id from another org is rejected (bad request, not 404)', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({
          email: 'cross@org-a.example',
          firstName: 'X',
          lastName: 'Y',
          externalId: 'auth0|xy',
          departmentId: DEPT_B, // belongs to ORG_B
        });
      expect(res.status).toBe(400);
    });

    it('denies non-admin roles (Manager holds user:view but not user:manage)', async () => {
      const token = await tokenFor('auth0|a-learner');
      const res = await request(app.getHttpServer())
        .post('/organizations/me/users').set('Authorization', `Bearer ${token}`)
        .send({ email: 'nope@org-a.example', firstName: 'N', lastName: 'O', externalId: 'auth0|n' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /organizations/me/users/:id', () => {
    it('updates profile fields', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .put('/organizations/me/users/44444444-0000-0000-0000-000000000002').set('Authorization', `Bearer ${token}`)
        .send({ jobTitle: 'Senior Analyst' });
      expect(res.status).toBe(200);
      expect(res.body.jobTitle).toBe('Senior Analyst');
    });

    it('assigns a role', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .put('/organizations/me/users/44444444-0000-0000-0000-000000000002').set('Authorization', `Bearer ${token}`)
        .send({ role: RoleKey.TRAINER });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe(RoleKey.TRAINER);
    });

    it('removes a role when `role: null`', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .put('/organizations/me/users/44444444-0000-0000-0000-000000000002').set('Authorization', `Bearer ${token}`)
        .send({ role: null });
      expect(res.status).toBe(200);
      expect(res.body.role).toBeNull();
    });

    it('clears department with departmentId: null', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .put('/organizations/me/users/44444444-0000-0000-0000-000000000002').set('Authorization', `Bearer ${token}`)
        .send({ departmentId: null });
      expect(res.status).toBe(200);
      expect(res.body.departmentId).toBeNull();
    });
  });

  describe('PATCH /organizations/me/users/:id/status', () => {
    it('deactivates an ACTIVE user', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .patch('/organizations/me/users/44444444-0000-0000-0000-000000000002/status').set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INACTIVE');
    });

    it('reactivates an INACTIVE user', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .patch('/organizations/me/users/44444444-0000-0000-0000-000000000003/status').set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('rejects setting status to INVITED via this endpoint', async () => {
      const token = await tokenFor('auth0|a-admin');
      const res = await request(app.getHttpServer())
        .patch('/organizations/me/users/44444444-0000-0000-0000-000000000002/status').set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVITED' });
      expect(res.status).toBe(400);
    });
  });
});
