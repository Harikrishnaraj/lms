import { INestApplication } from '@nestjs/common';
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
import { MembershipsController } from '../memberships.controller';
import { MembershipsService } from '../memberships.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

interface FakeRole {
  id: string;
  key: RoleKey;
  permissions: string[];
}

interface FakeMembership {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
}

/**
 * A tiny in-memory stand-in for the slice of PrismaClient that
 * AuthorizationService and MembershipsService actually call. This test
 * exercises the *real* guard chain (JwtAuthGuard, AuthorizationGuard,
 * TenantContextInterceptor) and the *real* controller/service logic —
 * only persistence is faked.
 */
function createFakePrisma() {
  const roles: FakeRole[] = [
    { id: 'role-learner', key: RoleKey.LEARNER, permissions: [] },
    { id: 'role-trainer', key: RoleKey.TRAINER, permissions: [] },
    { id: 'role-manager', key: RoleKey.MANAGER, permissions: ['user:view'] },
    { id: 'role-hr', key: RoleKey.HR_LD_ADMIN, permissions: ['user:view', 'user:manage'] },
    { id: 'role-org-admin', key: RoleKey.ORGANIZATION_ADMIN, permissions: ['user:view', 'user:manage'] },
  ];
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const rolesByKey = new Map(roles.map((r) => [r.key, r]));

  const memberships: FakeMembership[] = [
    { id: 'm1', organizationId: ORG_A, userId: 'auth0|org-a-admin', roleId: 'role-org-admin' },
    { id: 'm2', organizationId: ORG_A, userId: 'auth0|org-a-manager', roleId: 'role-manager' },
    { id: 'm3', organizationId: ORG_A, userId: 'auth0|org-a-trainer', roleId: 'role-trainer' },
    { id: 'm4', organizationId: ORG_A, userId: 'auth0|org-a-learner', roleId: 'role-learner' },
    // A member of Org B ONLY — the target of the cross-tenant probe below.
    { id: 'm5', organizationId: ORG_B, userId: 'auth0|shared-user', roleId: 'role-learner' },
  ];

  function toRolePermissionInclude(role: FakeRole) {
    return {
      id: role.id,
      key: role.key,
      rolePermissions: role.permissions.map((key) => ({
        roleId: role.id,
        permissionId: key,
        permission: { id: key, key },
      })),
    };
  }

  const prisma = {
    role: {
      findUniqueOrThrow: async ({ where }: { where: { key: RoleKey } }) => {
        const role = rolesByKey.get(where.key);
        if (!role) throw new Error(`Role not found: ${where.key}`);
        return { id: role.id, key: role.key };
      },
    },
    membership: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const { organizationId, userId } = where.organizationId_userId;
        const membership = memberships.find((m) => m.organizationId === organizationId && m.userId === userId);
        if (!membership) return null;
        const role = rolesById.get(membership.roleId)!;
        return { ...membership, role: toRolePermissionInclude(role) };
      },
      findMany: async ({ where }: { where: { organizationId: string } }) =>
        memberships.filter((m) => m.organizationId === where.organizationId),
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { organizationId_userId: { organizationId: string; userId: string } };
        update: { roleId: string };
        create: FakeMembership;
      }) => {
        const { organizationId, userId } = where.organizationId_userId;
        const existing = memberships.find((m) => m.organizationId === organizationId && m.userId === userId);
        if (existing) {
          existing.roleId = update.roleId;
          return existing;
        }
        const created = { ...create, id: `m-${memberships.length + 1}` };
        memberships.push(created);
        return created;
      },
      deleteMany: async ({ where }: { where: { organizationId: string; userId: string } }) => {
        const before = memberships.length;
        const remaining = memberships.filter(
          (m) => !(m.organizationId === where.organizationId && m.userId === where.userId),
        );
        const removed = before - remaining.length;
        memberships.length = 0;
        memberships.push(...remaining);
        return { count: removed };
      },
    },
  };

  return { prisma, memberships };
}

describe('RBAC: role, permission, and cross-tenant enforcement (security-critical)', () => {
  let app: INestApplication;
  let jwks: TestJwksServer;
  let fakePrisma: ReturnType<typeof createFakePrisma>['prisma'];
  let memberships: FakeMembership[];

  async function tokenFor(userId: string): Promise<string> {
    return new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: jwks.kid })
      .setIssuer(jwks.issuer)
      .setAudience(AUDIENCE)
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(jwks.privateKey);
  }

  beforeAll(async () => {
    jwks = await startTestJwksServer();
    const fake = createFakePrisma();
    fakePrisma = fake.prisma;
    memberships = fake.memberships;

    // JWTs here intentionally carry NO org_id/role/permissions custom claims.
    // TenantContextInterceptor resolves organizationId from request.user, so
    // we override JwtStrategy's mapping indirectly by having the tenant
    // resolved from a route param instead — see note below. To keep this
    // test focused on RBAC (not auth claim mapping, already covered in
    // auth/__tests__), we set organizationId directly on request.user via a
    // thin wrapper strategy behavior: encode org id as the claims namespace
    // org_id claim per-user, matching each fixture's real organization.
    const ORG_BY_USER: Record<string, string> = {
      'auth0|org-a-admin': ORG_A,
      'auth0|org-a-manager': ORG_A,
      'auth0|org-a-trainer': ORG_A,
      'auth0|org-a-learner': ORG_A,
      'auth0|shared-user': ORG_B,
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
      controllers: [MembershipsController],
      providers: [
        MembershipsService,
        AuthorizationService,
        JwtStrategy,
        Reflector,
        TenantContextStorage,
        { provide: PRISMA_CLIENT, useValue: fakePrisma },
        { provide: ConfigService, useValue: fakeConfigService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: AuthorizationGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
      ],
    })
      .overrideProvider(JwtStrategy)
      .useFactory({
        factory: () => {
          // Re-implement validate() to attach organizationId per test fixture,
          // exercising the real JwtAuthGuard/passport pipeline while keeping
          // token minting simple (sub only) — this suite's concern is RBAC,
          // not claim-mapping (see auth/__tests__/jwt-auth.e2e.test.ts for that).
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await jwks.close();
  });

  describe('ALLOWED ROLE', () => {
    it('an Organization Administrator can assign a role', async () => {
      const token = await tokenFor('auth0|org-a-admin');

      const response = await request(app.getHttpServer())
        .post('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'auth0|new-hire', role: RoleKey.TRAINER });

      expect(response.status).toBe(201);
      expect(response.body.organizationId).toBe(ORG_A);
      expect(response.body.roleId).toBe('role-trainer');
    });
  });

  describe('DENIED ROLE', () => {
    it.each([['auth0|org-a-manager'], ['auth0|org-a-trainer'], ['auth0|org-a-learner']])(
      '%s cannot assign a role (POST is restricted to HR_LD_ADMIN/ORGANIZATION_ADMIN)',
      async (userId) => {
        const token = await tokenFor(userId);

        const response = await request(app.getHttpServer())
          .post('/organizations/me/members')
          .set('Authorization', `Bearer ${token}`)
          .send({ userId: 'auth0|someone', role: RoleKey.LEARNER });

        expect(response.status).toBe(403);
      },
    );
  });

  describe('MISSING PERMISSION', () => {
    it('a Trainer (no user:view) cannot list organization members', async () => {
      const token = await tokenFor('auth0|org-a-trainer');

      const response = await request(app.getHttpServer())
        .get('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('a Learner (no user:view) cannot list organization members', async () => {
      const token = await tokenFor('auth0|org-a-learner');

      const response = await request(app.getHttpServer())
        .get('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('a Manager (holds user:view) CAN list organization members', async () => {
      const token = await tokenFor('auth0|org-a-manager');

      const response = await request(app.getHttpServer())
        .get('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('CROSS-TENANT ACCESS (security-critical)', () => {
    it("an Organization A admin cannot revoke a membership that only exists under Organization B", async () => {
      const token = await tokenFor('auth0|org-a-admin');

      const response = await request(app.getHttpServer())
        .delete('/organizations/me/members/auth0|shared-user')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      // The Org B membership must be completely untouched.
      expect(memberships.some((m) => m.organizationId === ORG_B && m.userId === 'auth0|shared-user')).toBe(true);
    });

    it("an Organization A admin's member list never includes Organization B's members", async () => {
      const token = await tokenFor('auth0|org-a-admin');

      const response = await request(app.getHttpServer())
        .get('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const userIds = response.body.map((m: FakeMembership) => m.userId);
      expect(userIds).not.toContain('auth0|shared-user');
    });

    it('rejects a request whose token resolves to no organization at all', async () => {
      const token = await tokenFor('auth0|stranger-with-no-org');

      const response = await request(app.getHttpServer())
        .get('/organizations/me/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  it('rejects unauthenticated requests outright', async () => {
    const response = await request(app.getHttpServer()).get('/organizations/me/members');
    expect(response.status).toBe(401);
  });
});
