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
import { CertificatesController } from '../certificates.controller';
import { CertificateVerificationController } from '../certificate-verification.controller';
import { CertificatesService } from '../certificates.service';
import { NotificationsService } from '../../notifications/notifications.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000011'; // LEARNER
const ORG_B_LEARNER = 'bbbbbbbb-0000-4000-8000-000000000001';

const COURSE_1 = 'cccccccc-0000-4000-8000-000000000001';
const CERTIFICATE_1 = 'ffffffff-aaaa-4000-8000-000000000001';
const VERIFY_TOKEN_1 = 'verify-token-xyz-123';

function seedFixtures() {
  const users = [
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: null },
    { id: ORG_B_LEARNER, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', departmentId: null },
  ];
  const courses = [{ id: COURSE_1, organizationId: ORG_A, title: 'Workplace Safety' }];
  const organizations = [{ id: ORG_A, name: 'Acme Corp' }];
  const certificates = [
    {
      id: CERTIFICATE_1,
      organizationId: ORG_A,
      userId: JORDAN,
      courseId: COURSE_1,
      certificateNumber: 'LMS-2026-ABCD',
      verificationToken: VERIFY_TOKEN_1,
      status: 'ACTIVE',
      issuedAt: new Date(),
      expiresAt: null,
    },
  ];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, certificates, memberships, organizations };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();
  const { users, courses, certificates, memberships, organizations } = fixtures;

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
      findFirst: async ({ where }: any) => users.find((u) => u.organizationId === where.organizationId && (u.id === where.id || u.externalId === where.externalId)),
    },
    certificate: {
      findMany: async ({ where }: any) => {
        return certificates
          .filter((c) => c.organizationId === where.organizationId && c.userId === where.userId)
          .map((c) => {
            const course = courses.find((x) => x.id === c.courseId);
            return { ...c, course };
          });
      },
      findFirst: async ({ where }: any) => {
        const c = certificates.find(
          (x) =>
            (where.id && x.id === where.id && x.organizationId === where.organizationId) ||
            (where.verificationToken && x.verificationToken === where.verificationToken && x.status === where.status),
        );
        if (!c) return null;
        const user = users.find((u) => u.id === c.userId);
        const course = courses.find((x) => x.id === c.courseId);
        const organization = organizations.find((o) => o.id === c.organizationId);
        return { ...c, user, course, organization };
      },
      findUnique: async ({ where }: any) => {
        const c = certificates.find(
          (x) =>
            (where.id && x.id === where.id) ||
            (where.verificationToken && x.verificationToken === where.verificationToken),
        );
        if (!c) return null;
        const user = users.find((u) => u.id === c.userId);
        const course = courses.find((x) => x.id === c.courseId);
        const organization = organizations.find((o) => o.id === c.organizationId);
        return { ...c, user, course, organization };
      },
    },
    organization: {
      findUniqueOrThrow: async ({ where }: any) => {
        const org = organizations.find((o) => o.id === where.id);
        if (!org) throw new Error('Organization not found');
        return org;
      },
    },
  };
  return prisma;
}

describe('CertificatesModule (e2e)', () => {
  let app: INestApplication;
  let jwksServer: TestJwksServer;
  let fakePrisma: any;

  beforeAll(async () => {
    jwksServer = await startTestJwksServer();
  });

  afterAll(async () => {
    await jwksServer.close();
  });

  beforeEach(async () => {
    fakePrisma = createFakePrisma();

    const ORG_BY_USER: Record<string, string> = {
      'auth0|jordan': ORG_A,
      'auth0|b-learner': ORG_B,
    };
    const fakeConfigService = {
      get: (key: string) =>
        (
          {
            AUTH0_DOMAIN: 'unused.example.com',
            AUTH0_AUDIENCE: AUDIENCE,
            AUTH_JWKS_URI: jwksServer.jwksUri,
            AUTH_ISSUER: jwksServer.issuer,
            AUTH_CLAIMS_NAMESPACE: CLAIMS_NAMESPACE,
          } as Record<string, string>
        )[key],
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      controllers: [CertificatesController, CertificateVerificationController],
      providers: [
        CertificatesService,
        UsersService,
        { provide: PRISMA_CLIENT, useValue: fakePrisma },
        JwtStrategy,
        AuthorizationService,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: AuthorizationGuard,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: TenantContextInterceptor,
        },
        {
          provide: NotificationsService,
          useValue: {
            enqueue: async () => {},
          },
        },
        TenantContextStorage,
        {
          provide: ConfigService,
          useValue: fakeConfigService,
        },
      ],
    })
      .overrideProvider(JwtStrategy)
      .useFactory({
        factory: () => {
          const strategy = new JwtStrategy(fakeConfigService as any);
          const originalValidate = strategy.validate.bind(strategy);
          strategy.validate = (payload: { sub: string }) => {
            const mapped = originalValidate(payload);
            return { ...mapped, organizationId: ORG_BY_USER[payload.sub] ?? null };
          };
          return strategy;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function generateToken(userId: string, orgId: string, role: string) {
    return new SignJWT({
      [`${CLAIMS_NAMESPACE}org_id`]: orgId,
      [`${CLAIMS_NAMESPACE}role`]: role,
      [`${CLAIMS_NAMESPACE}permissions`]: ROLE_PERMISSIONS[role] ?? [],
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwksServer.kid })
      .setIssuer(jwksServer.issuer)
      .setAudience(AUDIENCE)
      .setSubject(userId)
      .setExpirationTime('15m')
      .sign(jwksServer.privateKey);
  }

  it('GET /organizations/me/certificates/mine lists caller certificates', async () => {
    const token = await generateToken('auth0|jordan', ORG_A, 'LEARNER');
    const res = await request(app.getHttpServer())
      .get('/api/v1/organizations/me/certificates/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].certificateNumber).toBe('LMS-2026-ABCD');
    expect(res.body[0].course.title).toBe('Workplace Safety');
  });

  it('GET /organizations/me/certificates/:id/download serves a PDF', async () => {
    const token = await generateToken('auth0|jordan', ORG_A, 'LEARNER');
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/me/certificates/${CERTIFICATE_1}/download`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`attachment; filename="LMS-2026-ABCD.pdf"`);
  });

  it('GET /certificate-verifications/:token verifies certificate publicly without token authorization', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/certificate-verifications/${VERIFY_TOKEN_1}`)
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.learnerName).toBe('Jordan Lee');
    expect(res.body.courseTitle).toBe('Workplace Safety');
  });
});
