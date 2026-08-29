/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma stubs are intentionally loose */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
import { AuditController } from '../audit.controller';
import { AuditService } from '../audit.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const ORG_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000011';
const LEARNER = 'aaaaaaaa-0000-4000-8000-000000000022';

function seedFixtures() {
  const users = [
    { id: ORG_ADMIN, organizationId: ORG_A, externalId: 'auth0|admin', firstName: 'Ada', lastName: 'Admin', email: 'ada@org-a.example', status: 'ACTIVE' },
    { id: LEARNER, organizationId: ORG_A, externalId: 'auth0|learner', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', status: 'ACTIVE' },
  ];
  const auditLogs = [
    {
      id: 'log-1',
      organizationId: ORG_A,
      actorId: ORG_ADMIN,
      action: 'course:publish',
      entityType: 'Course',
      entityId: 'course-1',
      metadata: { title: 'Security 101' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      actor: users[0],
    },
    {
      id: 'log-2',
      organizationId: ORG_B,
      actorId: 'other-admin',
      action: 'org:update',
      entityType: 'Organization',
      entityId: ORG_B,
      metadata: {},
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      actor: null,
    },
  ];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|admin', roleKey: RoleKey.ORGANIZATION_ADMIN },
    { organizationId: ORG_A, userId: 'auth0|learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, auditLogs, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  ORGANIZATION_ADMIN: ['course:read', 'user:view', 'user:manage', 'org:admin'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();

  return {
    user: {
      findFirst: async ({ where }: any) => fixtures.users.find((u) => u.id === where.id || u.externalId === where.externalId) ?? null,
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = { id: `log-${Date.now()}`, ...data, createdAt: new Date(), actor: null };
        fixtures.auditLogs.push(log);
        return log;
      },
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        const matched = fixtures.auditLogs.filter((l) => {
          if (l.organizationId !== where.organizationId) return false;
          if (where.action?.contains && !l.action.toLowerCase().includes(where.action.contains.toLowerCase())) return false;
          if (where.entityType?.contains && !l.entityType.toLowerCase().includes(where.entityType.contains.toLowerCase())) return false;
          return true;
        });
        return matched.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        return fixtures.auditLogs.filter((l) => l.organizationId === where.organizationId).length;
      },
    },
  };
}

describe('Audit API', () => {
  let app: INestApplication;
  let jwksServer: TestJwksServer;
  const fake = { prisma: createFakePrisma() };

  beforeAll(async () => {
    jwksServer = await startTestJwksServer();
  });

  afterAll(async () => {
    await jwksServer.close();
  });

  beforeEach(async () => {
    const fakeConfigService = {
      get: (key: string) => fakeConfigService.getOrThrow(key),
      getOrThrow: (key: string) =>
        ({
          AUTH0_DOMAIN: 'unused.example.com',
          AUTH0_AUDIENCE: AUDIENCE,
          AUTH_JWKS_URI: jwksServer.jwksUri,
          AUTH_ISSUER: jwksServer.issuer,
          AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE,
        } as Record<string, string>)[key],
    };

    const usersService = new UsersService(fake.prisma as any);
    const authorizationService = {
      resolve: async (orgId: string, extId: string) => {
        const m = seedFixtures().memberships.find((x) => x.organizationId === orgId && x.userId === extId);
        if (!m) return null;
        return { role: m.roleKey, permissions: ROLE_PERMISSIONS[m.roleKey] ?? [] };
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuditController],
      providers: [
        AuditService,
        TenantContextStorage,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: AuthorizationService, useValue: authorizationService },
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
          const strategy = new JwtStrategy(fakeConfigService as any);
          const originalValidate = strategy.validate.bind(strategy);
          strategy.validate = (payload: { sub: string }) => {
            const mapped = originalValidate(payload);
            const ORG_BY_USER: Record<string, string> = {
              'auth0|admin': ORG_A,
              'auth0|learner': ORG_A,
            };
            return { ...mapped, organizationId: ORG_BY_USER[payload.sub] ?? null };
          };
          return strategy;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function tokenFor(sub: string) {
    return new SignJWT({
      iss: jwksServer.issuer,
      sub,
      aud: AUDIENCE,
      [`${CLAIMS_NAMESPACE}roles`]: [],
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwksServer.kid })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(jwksServer.privateKey);
  }

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/organizations/me/audit-logs');
    expect(res.status).toBe(401);
  });

  it('denies learner role from viewing audit logs', async () => {
    const token = await tokenFor('auth0|learner');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allows Organization Admin to view tenant-isolated audit logs', async () => {
    const token = await tokenFor('auth0|admin');
    const res = await request(app.getHttpServer())
      .get('/organizations/me/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].action).toBe('course:publish');
    expect(res.body.items[0].organizationId).toBe(ORG_A);
  });
});
