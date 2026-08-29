import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ContentType, Prisma, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { EnrollmentCaller, EnrollmentsService } from '../enrollments/enrollments.service';
import { STORAGE_PORT, StoragePort } from '../storage/storage.port';
import { MarkContentProgressDto } from './dto/mark-content-progress.dto';
import { CertificatesService } from '../certificates/certificates.service';

export type PlayerContentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface PlayerContentItem {
  id: string;
  title: string;
  type: ContentType;
  position: number;
  /** Only populated for TEXT items. */
  textBody: string | null;
  /** Resolved via StoragePort for items with a storageKey (VIDEO/DOCUMENT/RESOURCE). */
  playbackUrl: string | null;
  status: PlayerContentStatus;
  completedAt: Date | null;
  assessmentId: string | null;
}

export interface PlayerModuleView {
  id: string;
  title: string;
  position: number;
  contentItems: PlayerContentItem[];
}

export interface PlayerView {
  enrollment: {
    id: string;
    status: string;
    isMandatory: boolean;
    dueDate: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
  };
  course: { id: string; title: string };
  modules: PlayerModuleView[];
  /** First not-yet-completed content item across all modules, in order — null once everything is complete (or the course has no content yet). */
  resumeContentItemId: string | null;
}

/**
 * Task 15's "leave and return without losing progress" contract: every read
 * here is derived from ContentProgress rows keyed by (enrollmentId,
 * contentItemId), never from client-supplied state, so a learner always
 * lands back exactly where the server last recorded them.
 */
@Injectable()
export class PlayerService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  /** Reuses EnrollmentsService.getById for the "who can see this enrollment" check — same rule as GET /enrollments/:id (owner, or staff with enrollment:manage in scope). */
  async getPlayer(organizationId: string, enrollmentId: string, caller: EnrollmentCaller): Promise<PlayerView> {
    const enrollment = await this.enrollmentsService.getById(organizationId, enrollmentId, caller);

    const modules = await this.prisma.module.findMany({
      where: { organizationId, courseId: enrollment.courseId },
      orderBy: { position: 'asc' },
      include: { contentItems: { where: { status: 'ACTIVE' }, orderBy: { position: 'asc' }, include: { assessment: { select: { id: true } } } } },
    });

    const progressRows = await this.prisma.contentProgress.findMany({
      where: { organizationId, enrollmentId: enrollment.id },
    });
    const progressByContentItemId = new Map(progressRows.map((p) => [p.contentItemId, p]));

    const playerModules: PlayerModuleView[] = [];
    for (const m of modules) {
      const contentItems: PlayerContentItem[] = [];
      for (const ci of m.contentItems) {
        const progress = progressByContentItemId.get(ci.id);
        contentItems.push({
          id: ci.id,
          title: ci.title,
          type: ci.type,
          position: ci.position,
          textBody: ci.type === 'TEXT' ? ci.textBody : null,
          playbackUrl: ci.storageKey ? await this.storage.getDownloadUrl(ci.storageKey) : null,
          status: progress?.status ?? 'NOT_STARTED',
          completedAt: progress?.completedAt ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's dynamic `include` shape here isn't narrowed through this loop; revisit once a real `prisma generate` can confirm the inferred type.
          assessmentId: (ci as any).assessment?.id ?? null,
        });
      }
      playerModules.push({ id: m.id, title: m.title, position: m.position, contentItems });
    }

    const inOrder = playerModules.flatMap((m) => m.contentItems);
    const resumeContentItemId = inOrder.find((ci) => ci.status !== 'COMPLETED')?.id ?? null;

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        isMandatory: enrollment.isMandatory,
        dueDate: enrollment.dueDate,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
      },
      course: { id: enrollment.course.id, title: enrollment.course.title },
      modules: playerModules,
      resumeContentItemId,
    };
  }

  async markProgress(
    organizationId: string,
    enrollmentId: string,
    contentItemId: string,
    caller: EnrollmentCaller,
    dto: MarkContentProgressDto,
  ): Promise<PlayerView> {
    const enrollment = await this.enrollmentsService.getById(organizationId, enrollmentId, caller);

    const contentItem = await this.prisma.contentItem.findFirst({
      where: { id: contentItemId, organizationId, module: { courseId: enrollment.courseId } },
    });
    if (!contentItem) throw new NotFoundException('Content item not found in this course');

    const now = new Date();
    await this.prisma.contentProgress.upsert({
      where: { enrollmentId_contentItemId: { enrollmentId: enrollment.id, contentItemId } },
      update: {
        status: dto.status,
        lastAccessedAt: now,
        ...(dto.status === 'COMPLETED' ? { completedAt: now } : {}),
      },
      create: {
        organizationId,
        enrollmentId: enrollment.id,
        contentItemId,
        status: dto.status,
        lastAccessedAt: now,
        completedAt: dto.status === 'COMPLETED' ? now : null,
      },
    });

    await this.rollUpEnrollmentStatus(organizationId, enrollment.id, enrollment.courseId);

    return this.getPlayer(organizationId, enrollmentId, caller);
  }

  /**
   * Public because AssessmentsService drives the same rollup when a passing
   * quiz submission completes its QUIZ content item.
   *
   * Moves the Enrollment forward — never backward — from ContentProgress:
   * NOT_STARTED -> IN_PROGRESS on first touch, -> COMPLETED once every
   * ACTIVE content item in the course has a COMPLETED progress row. A
   * completed enrollment is left alone even if a learner revisits content
   * afterwards (no un-completing).
   */
  async rollUpEnrollmentStatus(organizationId: string, enrollmentId: string, courseId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id: enrollmentId, organizationId } });
    if (!enrollment || enrollment.status === 'COMPLETED') return;

    const [totalActiveContentItems, completedProgressCount] = await Promise.all([
      this.prisma.contentItem.count({ where: { organizationId, status: 'ACTIVE', module: { courseId } } }),
      this.prisma.contentProgress.count({ where: { organizationId, enrollmentId, status: 'COMPLETED' } }),
    ]);

    const data: Prisma.EnrollmentUpdateInput = {};
    if (enrollment.status === 'NOT_STARTED') {
      data.status = 'IN_PROGRESS';
      data.startedAt = enrollment.startedAt ?? new Date();
    }
    if (totalActiveContentItems > 0 && completedProgressCount >= totalActiveContentItems) {
      data.status = 'COMPLETED';
      data.completedAt = new Date();
    }
    if (Object.keys(data).length > 0) {
      await this.prisma.enrollment.update({ where: { id: enrollmentId }, data });
      if (data.status === 'COMPLETED') {
        await this.certificatesService.issueForCompletedEnrollment(organizationId, enrollment.userId, courseId);
      }
    }
  }
}
