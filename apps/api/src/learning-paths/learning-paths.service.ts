import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Course,
  EnrollmentSource,
  LearningPath,
  LearningPathCourse,
  LearningPathStatus,
  Prisma,
  PrismaClient,
  User,
} from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AddLearningPathCourseDto } from './dto/add-learning-path-course.dto';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { ListLearningPathsQueryDto } from './dto/list-learning-paths.dto';
import { ReorderLearningPathCoursesDto } from './dto/reorder-learning-path-courses.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';

const DEFAULT_PAGE_SIZE = 25;

type CourseRef = Pick<Course, 'id' | 'title' | 'status' | 'visibility' | 'durationMinutes' | 'difficulty'>;
type CreatorRef = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export interface LearningPathCourseWithCourse extends LearningPathCourse {
  course: CourseRef;
}

export interface LearningPathWithRelations extends LearningPath {
  createdBy: CreatorRef | null;
  courses: LearningPathCourseWithCourse[];
}

export interface PaginatedLearningPaths {
  items: LearningPathWithRelations[];
  page: number;
  pageSize: number;
  total: number;
}

/** Derived, not stored -- see the LearningPath model docblock in schema.prisma. */
export type LearningPathProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LearningPathCourseProgress {
  courseId: string;
  title: string;
  position: number;
  isRequired: boolean;
  enrollmentId: string | null;
  enrollmentStatus: 'NOT_ENROLLED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface LearningPathProgress {
  status: LearningPathProgressStatus;
  isEnrolled: boolean;
  isMandatory: boolean;
  dueDate: Date | null;
  courses: LearningPathCourseProgress[];
}

export interface AssignPathOptions {
  source: EnrollmentSource;
  assignedById: string | null;
  isMandatory: boolean;
  dueDate: Date | null;
}

const ADMIN_INCLUDE = {
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  courses: {
    orderBy: { position: 'asc' },
    include: {
      course: { select: { id: true, title: true, status: true, visibility: true, durationMinutes: true, difficulty: true } },
    },
  },
} satisfies Prisma.LearningPathInclude;

@Injectable()
export class LearningPathsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // ---------------------------------------------------------------------
  // Admin/L&D authoring surface (Task 16: create/edit/add/reorder/publish)
  // ---------------------------------------------------------------------

  async list(organizationId: string, query: ListLearningPathsQueryDto): Promise<PaginatedLearningPaths> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.LearningPathWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.learningPath.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.learningPath.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async getById(organizationId: string, id: string): Promise<LearningPathWithRelations> {
    const path = await this.prisma.learningPath.findFirst({ where: { id, organizationId }, include: ADMIN_INCLUDE });
    if (!path) throw new NotFoundException('Learning path not found');
    return path;
  }

  async create(organizationId: string, createdById: string, dto: CreateLearningPathDto): Promise<LearningPathWithRelations> {
    const path = await this.prisma.learningPath.create({
      data: { organizationId, title: dto.title, description: dto.description, createdById },
    });
    return this.getById(organizationId, path.id);
  }

  async update(organizationId: string, id: string, dto: UpdateLearningPathDto): Promise<LearningPathWithRelations> {
    await this.getById(organizationId, id);
    const data: Prisma.LearningPathUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    await this.prisma.learningPath.update({ where: { id }, data });
    return this.getById(organizationId, id);
  }

  /**
   * Publish validation mirrors CoursesService's low bar: at least one
   * course, and every REQUIRED course must itself be PUBLISHED (a path
   * can't promise progress toward a course a learner can't actually take).
   * Optional courses are exempt -- they're supplementary, not gating.
   */
  async setStatus(organizationId: string, id: string, status: LearningPathStatus): Promise<LearningPathWithRelations> {
    const path = await this.getById(organizationId, id);
    if (status === 'PUBLISHED') {
      if (path.courses.length === 0) {
        throw new BadRequestException('A learning path needs at least one course before it can be published');
      }
      const unpublishedRequired = path.courses.filter((c) => c.isRequired && c.course.status !== 'PUBLISHED');
      if (unpublishedRequired.length > 0) {
        throw new BadRequestException(
          `Every required course must be published first: ${unpublishedRequired.map((c) => c.course.title).join(', ')}`,
        );
      }
    }
    await this.prisma.learningPath.update({ where: { id }, data: { status } });
    return this.getById(organizationId, id);
  }

  async addCourse(organizationId: string, learningPathId: string, dto: AddLearningPathCourseDto): Promise<LearningPathWithRelations> {
    await this.getById(organizationId, learningPathId);
    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId } });
    if (!course) throw new BadRequestException('Invalid course for this organization');

    const existing = await this.prisma.learningPathCourse.findUnique({
      where: { learningPathId_courseId: { learningPathId, courseId: dto.courseId } },
    });
    if (existing) throw new ConflictException('That course is already in this learning path');

    const count = await this.prisma.learningPathCourse.count({ where: { organizationId, learningPathId } });
    await this.prisma.learningPathCourse.create({
      data: {
        organizationId,
        learningPathId,
        courseId: dto.courseId,
        position: count,
        isRequired: dto.isRequired ?? true,
      },
    });
    return this.getById(organizationId, learningPathId);
  }

  async removeCourse(organizationId: string, learningPathId: string, courseId: string): Promise<LearningPathWithRelations> {
    await this.getById(organizationId, learningPathId);
    const membership = await this.prisma.learningPathCourse.findUnique({
      where: { learningPathId_courseId: { learningPathId, courseId } },
    });
    if (!membership) throw new NotFoundException('That course is not in this learning path');

    await this.prisma.learningPathCourse.delete({ where: { id: membership.id } });

    // Re-densify positions so a later reorder submission (which must name
    // every remaining course) has no gaps to reason about.
    const remaining = await this.prisma.learningPathCourse.findMany({
      where: { organizationId, learningPathId },
      orderBy: { position: 'asc' },
    });
    await this.prisma.$transaction(
      remaining.map((row, position) => this.prisma.learningPathCourse.update({ where: { id: row.id }, data: { position } })),
    );
    return this.getById(organizationId, learningPathId);
  }

  /** Full reorder, same all-or-nothing contract as CourseModulesService.reorder. */
  async reorderCourses(organizationId: string, learningPathId: string, dto: ReorderLearningPathCoursesDto): Promise<LearningPathWithRelations> {
    await this.getById(organizationId, learningPathId);
    const existing = await this.prisma.learningPathCourse.findMany({
      where: { organizationId, learningPathId },
      select: { id: true, courseId: true },
    });
    const byCourseId = new Map(existing.map((row) => [row.courseId, row.id]));
    const existingCourseIds = new Set(existing.map((row) => row.courseId));
    const submittedCourseIds = new Set(dto.courseIds);

    if (existingCourseIds.size !== submittedCourseIds.size || [...existingCourseIds].some((id) => !submittedCourseIds.has(id))) {
      throw new BadRequestException('courseIds must contain exactly the courses belonging to this learning path');
    }

    await this.prisma.$transaction(
      dto.courseIds.map((courseId, position) =>
        this.prisma.learningPathCourse.update({ where: { id: byCourseId.get(courseId)! }, data: { position } }),
      ),
    );
    return this.getById(organizationId, learningPathId);
  }

  // ---------------------------------------------------------------------
  // Learner-facing surface (browse published paths, join, view progress)
  // ---------------------------------------------------------------------

  async listPublished(organizationId: string, learnerId: string | null, query: ListLearningPathsQueryDto): Promise<{
    items: (LearningPathWithRelations & { progress: LearningPathProgress })[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.LearningPathWhereInput = {
      organizationId,
      status: 'PUBLISHED',
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.learningPath.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.learningPath.count({ where }),
    ]);
    const withProgress = await Promise.all(items.map(async (path) => ({ ...path, progress: await this.getProgress(organizationId, path, learnerId) })));
    return { items: withProgress, page, pageSize, total };
  }

  async getPublishedById(organizationId: string, id: string, learnerId: string | null): Promise<LearningPathWithRelations & { progress: LearningPathProgress }> {
    const path = await this.prisma.learningPath.findFirst({ where: { id, organizationId, status: 'PUBLISHED' }, include: ADMIN_INCLUDE });
    if (!path) throw new NotFoundException('Learning path not found');
    const progress = await this.getProgress(organizationId, path, learnerId);
    return { ...path, progress };
  }

  async listMine(organizationId: string, learnerId: string): Promise<(LearningPathWithRelations & { progress: LearningPathProgress })[]> {
    const enrollments = await this.prisma.learningPathEnrollment.findMany({
      where: { organizationId, userId: learnerId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    const paths = await Promise.all(
      enrollments.map(async (enrollment) => {
        const path = await this.getById(organizationId, enrollment.learningPathId);
        const progress = await this.getProgress(organizationId, path, learnerId);
        return { ...path, progress };
      }),
    );
    return paths;
  }

  /** Self-enrollment: a learner joins any PUBLISHED path on their own. */
  async selfEnroll(organizationId: string, learnerId: string, learningPathId: string): Promise<LearningPathProgress> {
    const path = await this.prisma.learningPath.findFirst({ where: { id: learningPathId, organizationId, status: 'PUBLISHED' } });
    if (!path) throw new NotFoundException('Learning path not found');

    const existing = await this.prisma.learningPathEnrollment.findUnique({
      where: { organizationId_userId_learningPathId: { organizationId, userId: learnerId, learningPathId } },
    });
    if (existing) throw new ConflictException('You are already on this learning path');

    await this.assignPath(organizationId, learnerId, learningPathId, {
      source: 'SELF',
      assignedById: null,
      isMandatory: false,
      dueDate: null,
    });
    const withRelations = await this.getById(organizationId, learningPathId);
    return this.getProgress(organizationId, withRelations, learnerId);
  }

  /**
   * Joins a learner onto a path (self, admin, or manager sourced) and
   * cascades an Enrollment for every REQUIRED member course, via
   * EnrollmentsService.upsertAssignedEnrollment. Used directly by
   * `selfEnroll` above and by AssignmentsService for staff-initiated
   * path assignment (Task 17). Upserts on both the path enrollment and
   * each cascaded course enrollment, so calling this again for the same
   * user (e.g. a due-date change) updates in place rather than erroring.
   */
  async assignPath(organizationId: string, userId: string, learningPathId: string, opts: AssignPathOptions): Promise<void> {
    const path = await this.prisma.learningPath.findFirst({
      where: { id: learningPathId, organizationId, status: 'PUBLISHED' },
      include: ADMIN_INCLUDE,
    });
    if (!path) throw new BadRequestException('Invalid or unpublished learning path for this organization');

    await this.prisma.learningPathEnrollment.upsert({
      where: { organizationId_userId_learningPathId: { organizationId, userId, learningPathId } },
      update: { isMandatory: opts.isMandatory, dueDate: opts.dueDate, source: opts.source, assignedById: opts.assignedById },
      create: {
        organizationId,
        userId,
        learningPathId,
        isMandatory: opts.isMandatory,
        dueDate: opts.dueDate,
        source: opts.source,
        assignedById: opts.assignedById,
      },
    });

    const requiredCourses = path.courses.filter((c) => c.isRequired);
    for (const membership of requiredCourses) {
      await this.enrollmentsService.upsertAssignedEnrollment(organizationId, userId, membership.courseId, {
        source: opts.source,
        assignedById: opts.assignedById,
        isMandatory: opts.isMandatory,
        dueDate: opts.dueDate,
      });
    }
  }

  /**
   * Derives path status from the member courses' Enrollment rows for this
   * learner -- see the LearningPath model docblock for why this is
   * computed rather than stored. `learnerId === null` (browsing without a
   * provisioned profile, same convention as CatalogController) reads as
   * "not enrolled in anything."
   */
  private async getProgress(organizationId: string, path: LearningPathWithRelations, learnerId: string | null): Promise<LearningPathProgress> {
    const courseIds = path.courses.map((c) => c.courseId);
    const [pathEnrollment, courseEnrollments] = await Promise.all([
      learnerId
        ? this.prisma.learningPathEnrollment.findUnique({
            where: { organizationId_userId_learningPathId: { organizationId, userId: learnerId, learningPathId: path.id } },
          })
        : Promise.resolve(null),
      learnerId && courseIds.length > 0
        ? this.prisma.enrollment.findMany({ where: { organizationId, userId: learnerId, courseId: { in: courseIds } } })
        : Promise.resolve([]),
    ]);
    const enrollmentByCourseId = new Map(courseEnrollments.map((e) => [e.courseId, e]));

    const courses: LearningPathCourseProgress[] = path.courses.map((membership) => {
      const enrollment = enrollmentByCourseId.get(membership.courseId);
      return {
        courseId: membership.courseId,
        title: membership.course.title,
        position: membership.position,
        isRequired: membership.isRequired,
        enrollmentId: enrollment?.id ?? null,
        enrollmentStatus: enrollment?.status ?? 'NOT_ENROLLED',
      };
    });

    const requiredCourses = courses.filter((c) => c.isRequired);
    const completedRequired = requiredCourses.filter((c) => c.enrollmentStatus === 'COMPLETED').length;
    // NOT_STARTED means "enrolled but untouched" at the course level too
    // (see Enrollment/PlayerService) -- being auto-enrolled into a
    // required course by joining the path shouldn't, by itself, read as
    // "in progress" before the learner has actually opened anything.
    const anyStarted = courses.some((c) => c.enrollmentStatus === 'IN_PROGRESS' || c.enrollmentStatus === 'COMPLETED');

    let status: LearningPathProgressStatus = 'NOT_STARTED';
    if (requiredCourses.length > 0 && completedRequired === requiredCourses.length) {
      status = 'COMPLETED';
    } else if (anyStarted) {
      status = 'IN_PROGRESS';
    }

    return {
      status,
      isEnrolled: pathEnrollment !== null,
      isMandatory: pathEnrollment?.isMandatory ?? false,
      dueDate: pathEnrollment?.dueDate ?? null,
      courses,
    };
  }
}
