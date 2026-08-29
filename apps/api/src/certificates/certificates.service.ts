import { randomBytes, randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Certificate, Prisma, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { NotificationsService } from '../notifications/notifications.service';

export interface CertificateWithRelations extends Certificate {
  course: { id: string; title: string };
  user: { id: string; firstName: string; lastName: string; email: string };
}

/** What a public verification lookup is allowed to reveal — no email, no ids. */
export interface CertificateVerification {
  valid: boolean;
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  expiresAt: Date | null;
  status: Certificate['status'];
}

const INCLUDE = {
  course: { select: { id: true, title: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.CertificateInclude;

/**
 * Task 20. Issuance is driven by course completion, never requested
 * directly by a learner: PlayerService calls `issueForCompletedEnrollment`
 * once an Enrollment rolls up to COMPLETED, which in turn only happens
 * when every ACTIVE content item — including any QUIZ item, which needs a
 * *passing* assessment attempt — is complete. That is the whole of "based
 * on the approved course completion and assessment rules"; there is no
 * second eligibility rule stored anywhere else.
 */
@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Idempotent by construction: the (organizationId, userId, courseId)
   * lookup happens first and an existing certificate is returned as-is, so
   * re-running completion rollup — or two requests racing it — can never
   * mint a second number for the same achievement. The unique constraints
   * on certificate_number / verification_token are the backstop if two
   * inserts do race; a loser is folded back into the existing row.
   */
  async issueForCompletedEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ): Promise<Certificate | null> {
    const existing = await this.prisma.certificate.findFirst({ where: { organizationId, userId, courseId } });
    if (existing) return existing;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_userId_courseId: { organizationId, userId, courseId } },
    });
    if (!enrollment || enrollment.status !== 'COMPLETED') return null;

    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId } });
    if (!course) return null;

    const issuedAt = enrollment.completedAt ?? new Date();
    const expiresAt =
      course.certificateValidityDays === null
        ? null
        : new Date(issuedAt.getTime() + course.certificateValidityDays * 24 * 60 * 60 * 1000);

    let certificate: Certificate;
    try {
      certificate = await this.prisma.certificate.create({
        data: {
          organizationId,
          userId,
          courseId,
          certificateNumber: buildCertificateNumber(issuedAt),
          verificationToken: randomUUID(),
          issuedAt,
          expiresAt,
        },
      });
    } catch (error) {
      // Unique-constraint loser in a race: the other writer already issued
      // the certificate, which is exactly the outcome we wanted.
      const raced = await this.prisma.certificate.findFirst({ where: { organizationId, userId, courseId } });
      if (raced) return raced;
      throw error;
    }

    await this.notificationsService.enqueue({
      organizationId,
      userId,
      type: 'CERTIFICATE_ISSUED',
      title: `Certificate issued: ${course.title}`,
      body: `Your certificate ${certificate.certificateNumber} for "${course.title}" is ready to download.`,
      linkUrl: '/learner/certificates',
    });

    return certificate;
  }

  async listMine(organizationId: string, userId: string): Promise<CertificateWithRelations[]> {
    return this.prisma.certificate.findMany({
      where: { organizationId, userId },
      include: INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Staff view (`report:view`), e.g. the HR compliance screen. */
  async list(organizationId: string, filters: { userId?: string; courseId?: string } = {}): Promise<CertificateWithRelations[]> {
    return this.prisma.certificate.findMany({
      where: {
        organizationId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
      },
      include: INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Owner-only read; staff use `list` above. */
  async getOwned(organizationId: string, userId: string, id: string): Promise<CertificateWithRelations> {
    const certificate = await this.prisma.certificate.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!certificate) throw new NotFoundException('Certificate not found');
    if (certificate.userId !== userId) throw new ForbiddenException('This certificate belongs to another learner');
    return certificate;
  }

  /**
   * Public, unauthenticated lookup by verification token. Deliberately
   * returns a 404 rather than `{ valid: false }` for an unknown token, so
   * the endpoint can't be used to enumerate tokens; a *known* token for a
   * revoked or expired certificate does return `valid: false`, which is
   * the answer a verifier actually needs.
   */
  async verify(token: string): Promise<CertificateVerification> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationToken: token },
      include: INCLUDE,
    });
    if (!certificate) throw new NotFoundException('No certificate matches that verification token');

    const expired = certificate.expiresAt !== null && certificate.expiresAt.getTime() < Date.now();
    return {
      valid: certificate.status === 'ACTIVE' && !expired,
      certificateNumber: certificate.certificateNumber,
      learnerName: `${certificate.user.firstName} ${certificate.user.lastName}`,
      courseTitle: certificate.course.title,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      status: certificate.status,
    };
  }

  async revoke(organizationId: string, id: string): Promise<Certificate> {
    const certificate = await this.prisma.certificate.findFirst({ where: { id, organizationId } });
    if (!certificate) throw new NotFoundException('Certificate not found');
    return this.prisma.certificate.update({ where: { id: certificate.id }, data: { status: 'REVOKED' } });
  }
}

/** `LMS-2026-3F9A1C4B` — year-scoped and human-quotable over the phone. */
function buildCertificateNumber(issuedAt: Date): string {
  return `LMS-${issuedAt.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}
