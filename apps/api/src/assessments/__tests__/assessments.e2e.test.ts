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
import { PlayerService } from '../../player/player.service';
import { AssessmentsController } from '../assessments.controller';
import { LearnerAssessmentsController } from '../learner-assessments.controller';
import { AssessmentsService } from '../assessments.service';

const AUDIENCE = 'https://api.lms.test';
const CLAIMS_NAMESPACE = 'https://lms.app/';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const JORDAN = 'aaaaaaaa-0000-4000-8000-000000000011'; // LEARNER
const TRAINER_ALEX = 'aaaaaaaa-0000-4000-8000-000000000022'; // TRAINER
const ORG_B_LEARNER = 'bbbbbbbb-0000-4000-8000-000000000001';

const COURSE_1 = 'cccccccc-0000-4000-8000-000000000001';
const MODULE_1 = 'dddddddd-0000-4000-8000-000000000001';
const QUIZ_CONTENT_ITEM = 'eeeeeeee-0000-4000-8000-000000000001';
const ENROLLMENT_1 = 'ffffffff-0000-4000-8000-000000000001';
const ASSESSMENT_1 = 'aaaaaaaa-1111-4000-8000-000000000001';
const QUESTION_1 = '11111111-1111-4000-8000-000000000001';

function seedFixtures() {
  const users = [
    { id: JORDAN, organizationId: ORG_A, externalId: 'auth0|jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@org-a.example', departmentId: null },
    { id: TRAINER_ALEX, organizationId: ORG_A, externalId: 'auth0|alex', firstName: 'Alex', lastName: 'Trainer', email: 'alex@org-a.example', departmentId: null },
    { id: ORG_B_LEARNER, organizationId: ORG_B, externalId: 'auth0|b-learner', firstName: 'Bo', lastName: 'Learner', email: 'bo@org-b.example', departmentId: null },
  ];
  const courses = [{ id: COURSE_1, organizationId: ORG_A, title: 'Workplace Safety' }];
  const modules = [{ id: MODULE_1, organizationId: ORG_A, courseId: COURSE_1, title: 'Final exam', position: 0 }];
  const contentItems = [
    { id: QUIZ_CONTENT_ITEM, organizationId: ORG_A, moduleId: MODULE_1, title: 'Module Quiz', type: 'QUIZ', position: 0, status: 'ACTIVE' },
  ];
  const enrollments = [
    { id: ENROLLMENT_1, organizationId: ORG_A, userId: JORDAN, courseId: COURSE_1, status: 'NOT_STARTED', isMandatory: false, source: 'SELF', assignedById: null, dueDate: null, startedAt: null, completedAt: null },
  ];
  const assessments = [
    { id: ASSESSMENT_1, organizationId: ORG_A, contentItemId: QUIZ_CONTENT_ITEM, title: 'Module Quiz', description: 'Test', passingScore: 70, attemptLimit: 3 },
  ];
  const questions = [
    { id: QUESTION_1, organizationId: ORG_A, assessmentId: ASSESSMENT_1, text: 'What color is the sky?', options: ['Red', 'Blue', 'Green'], correctIndex: 1, points: 10, createdAt: new Date() },
  ];
  const assessmentAttempts: any[] = [];
  const contentProgress: any[] = [];
  const memberships = [
    { organizationId: ORG_A, userId: 'auth0|jordan', roleKey: RoleKey.LEARNER },
    { organizationId: ORG_A, userId: 'auth0|alex', roleKey: RoleKey.TRAINER },
    { organizationId: ORG_B, userId: 'auth0|b-learner', roleKey: RoleKey.LEARNER },
  ];
  return { users, courses, modules, contentItems, enrollments, assessments, questions, assessmentAttempts, contentProgress, memberships };
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  LEARNER: ['course:read'],
  TRAINER: ['course:read', 'course:update'],
};

function createFakePrisma() {
  const fixtures = seedFixtures();
  const { users, courses, contentItems, enrollments, assessments, questions, assessmentAttempts, contentProgress, memberships } = fixtures;

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
    course: {
      findFirst: async ({ where }: any) => courses.find((c) => c.id === where.id && c.organizationId === where.organizationId),
    },
    contentItem: {
      findFirst: async ({ where }: any) => {
        const ci = contentItems.find((c) => c.id === where.id && c.organizationId === where.organizationId);
        if (!ci) return null;
        return { ...ci, module: { courseId: COURSE_1 } };
      },
    },
    enrollment: {
      findUnique: async ({ where }: any) => {
        const composite = where.organizationId_userId_courseId || where.organizationId_userId;
        if (!composite) return null;
        const { organizationId, userId, courseId } = composite;
        const e = enrollments.find((x) => x.organizationId === organizationId && x.userId === userId && (!courseId || x.courseId === courseId));
        return e ?? null;
      },
      findFirst: async ({ where }: any) => enrollments.find((e) => e.id === where.id && e.organizationId === where.organizationId),
      update: async ({ where, data }: any) => {
        const e = enrollments.find((x) => x.id === where.id);
        if (e) Object.assign(e, data);
        return e;
      },
    },
    contentProgress: {
      upsert: async ({ where, update, create }: any) => {
        const { enrollmentId, contentItemId } = where.enrollmentId_contentItemId;
        let p = contentProgress.find((x) => x.enrollmentId === enrollmentId && x.contentItemId === contentItemId);
        if (p) {
          Object.assign(p, update);
        } else {
          p = { ...create, id: `progress-${contentItemId}` };
          contentProgress.push(p);
        }
        return p;
      },
      count: async () => contentProgress.length,
    },
    assessment: {
      findFirst: async ({ where }: any) => {
        const a = assessments.find((x) => x.organizationId === where.organizationId && (x.id === where.id || x.contentItemId === where.contentItemId));
        if (!a) return null;
        const matchingCi = contentItems.find((ci) => ci.id === a.contentItemId);
        const qList = questions.filter((q) => q.assessmentId === a.id);
        return { ...a, questions: qList, contentItem: matchingCi ? { ...matchingCi, module: { courseId: COURSE_1 } } : null };
      },
      findUnique: async ({ where }: any) => {
        const a = assessments.find((x) => x.id === where.id);
        if (!a) return null;
        const qList = questions.filter((q) => q.assessmentId === a.id);
        return { ...a, questions: qList };
      },
      create: async ({ data }: any) => {
        const a = { ...data, id: `new-assessment-uuid`, createdAt: new Date(), updatedAt: new Date() };
        assessments.push(a);
        return a;
      },
      update: async ({ where, data }: any) => {
        const a = assessments.find((x) => x.id === where.id);
        if (a) Object.assign(a, data);
        return a;
      },
    },
    question: {
      deleteMany: async () => {
        questions.length = 0;
      },
      createMany: async ({ data }: any) => {
        data.forEach((q: any) => questions.push({ ...q, id: `q-${crypto.randomUUID()}` }));
      },
    },
    assessmentAttempt: {
      count: async () => assessmentAttempts.length,
      findMany: async ({ where }: any) => {
        return assessmentAttempts.filter((a) => a.organizationId === where.organizationId && a.assessmentId === where.assessmentId && a.userId === where.userId);
      },
      create: async ({ data }: any) => {
        const attempt = { ...data, id: `attempt-${crypto.randomUUID()}` };
        assessmentAttempts.push(attempt);
        return attempt;
      },
    },
    certificate: {
      findFirst: async () => null,
      create: async ({ data }: any) => ({ ...data, id: `cert-${crypto.randomUUID()}`, issuedAt: new Date() }),
    },
    $transaction: async (cb: any) => cb(prisma),
  };
  return prisma;
}

describe('AssessmentsModule (e2e)', () => {
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
      'auth0|alex': ORG_A,
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
      controllers: [AssessmentsController, LearnerAssessmentsController],
      providers: [
        AssessmentsService,
        UsersService,
        {
          provide: PlayerService,
          useValue: {
            rollUpEnrollmentStatus: async () => {},
          },
        },
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

  it('GET /organizations/me/my-assessments/:id masks answers for learners', async () => {
    const token = await generateToken('auth0|jordan', ORG_A, 'LEARNER');
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/me/my-assessments/${ASSESSMENT_1}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.questions[0].correctIndex).toBeUndefined();
    expect(res.body.questions[0].text).toBe('What color is the sky?');
  });

  it('GET /organizations/me/assessments/:id yields answers for trainers', async () => {
    const token = await generateToken('auth0|alex', ORG_A, 'TRAINER');
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/me/assessments/${ASSESSMENT_1}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.questions[0].correctIndex).toBe(1);
    expect(res.body.questions[0].text).toBe('What color is the sky?');
  });

  it('POST /organizations/me/my-assessments/:id/submit grades the submission correctly', async () => {
    const token = await generateToken('auth0|jordan', ORG_A, 'LEARNER');
    
    // Send correct answer
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/me/my-assessments/${ASSESSMENT_1}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: QUESTION_1, selectedIndex: 1 }] })
      .expect(201);

    expect(res.body.score).toBe(100);
    expect(res.body.passed).toBe(true);
  });
});
