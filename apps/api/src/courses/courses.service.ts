import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Category, Course, CourseStatus, Prisma, PrismaClient, User } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCatalogQueryDto } from './dto/list-catalog.dto';
import { ListCoursesQueryDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const DEFAULT_PAGE_SIZE = 25;
type InstructorRef = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export interface CourseWithRelations extends Course {
  instructor: InstructorRef | null;
  categories: Category[];
}

export interface PaginatedCourses {
  items: CourseWithRelations[];
  page: number;
  pageSize: number;
  total: number;
}

/** Learner-facing enrollment status merged onto a catalog course (Task 13). */
export type CatalogEnrollmentStatus = 'NOT_ENROLLED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CatalogCourse extends CourseWithRelations {
  enrollmentId: string | null;
  enrollmentStatus: CatalogEnrollmentStatus;
  isMandatory: boolean;
  dueDate: Date | null;
}

export interface PaginatedCatalogCourses {
  items: CatalogCourse[];
  page: number;
  pageSize: number;
  total: number;
}

const INCLUDE = {
  instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
  categories: true,
} satisfies Prisma.CourseInclude;

@Injectable()
export class CoursesService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(organizationId: string, query: ListCoursesQueryDto): Promise<PaginatedCourses> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.CourseWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.instructorId ? { instructorId: query.instructorId } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.category ? { categories: { some: { name: query.category } } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async getById(organizationId: string, id: string): Promise<CourseWithRelations> {
    const course = await this.prisma.course.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(organizationId: string, dto: CreateCourseDto): Promise<CourseWithRelations> {
    if (dto.instructorId) {
      await this.assertUserInOrg(organizationId, dto.instructorId);
    }

    return this.prisma.course.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        difficulty: dto.difficulty,
        durationMinutes: dto.durationMinutes,
        learningObjectives: dto.learningObjectives ?? [],
        visibility: dto.visibility,
        instructorId: dto.instructorId,
        categories: dto.categories ? { connectOrCreate: this.categoryConnectors(organizationId, dto.categories) } : undefined,
      },
      include: INCLUDE,
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCourseDto): Promise<CourseWithRelations> {
    await this.getById(organizationId, id);
    if (dto.instructorId) {
      await this.assertUserInOrg(organizationId, dto.instructorId);
    }

    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.difficulty !== undefined) data.difficulty = dto.difficulty;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.learningObjectives !== undefined) data.learningObjectives = dto.learningObjectives;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.instructorId !== undefined) {
      data.instructor = dto.instructorId ? { connect: { id: dto.instructorId } } : { disconnect: true };
    }
    if (dto.categories !== undefined) {
      data.categories = { set: [], connectOrCreate: this.categoryConnectors(organizationId, dto.categories) };
    }

    return this.prisma.course.update({ where: { id }, data, include: INCLUDE });
  }

  async setStatus(organizationId: string, id: string, status: CourseStatus): Promise<CourseWithRelations> {
    await this.getById(organizationId, id);
    if (status === 'PUBLISHED') {
      await this.assertPublishable(organizationId, id);
    }
    return this.prisma.course.update({ where: { id }, data: { status }, include: INCLUDE });
  }

  /**
   * Publish validation (Task 12): a course needs at least one module, and at
   * least one ACTIVE content item somewhere in it. This is deliberately a
   * low bar — it catches "published nothing," not "every module is
   * complete" — a course can keep growing content after publish.
   */
  private async assertPublishable(organizationId: string, courseId: string): Promise<void> {
    const activeContentCount = await this.prisma.contentItem.count({
      where: { organizationId, status: 'ACTIVE', module: { courseId } },
    });
    if (activeContentCount === 0) {
      throw new BadRequestException(
        'A course needs at least one module with at least one active content item before it can be published',
      );
    }
  }

  /**
   * Learner catalog (Task 13): PUBLIC + PUBLISHED courses only — everything
   * else (DRAFT/ARCHIVED, or PRIVATE regardless of status) is reachable
   * only via direct assignment/enrollment, never catalog browsing.
   */
  async listCatalog(
    organizationId: string,
    learnerId: string | null,
    query: ListCatalogQueryDto,
  ): Promise<PaginatedCatalogCourses> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;

    const durationFilter: Prisma.IntFilter | undefined =
      query.minDurationMinutes !== undefined || query.maxDurationMinutes !== undefined
        ? {
            ...(query.minDurationMinutes !== undefined ? { gte: query.minDurationMinutes } : {}),
            ...(query.maxDurationMinutes !== undefined ? { lte: query.maxDurationMinutes } : {}),
          }
        : undefined;

    const where: Prisma.CourseWhereInput = {
      organizationId,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.category ? { categories: { some: { name: query.category } } } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(durationFilter ? { durationMinutes: durationFilter } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items: await this.attachEnrollmentStatus(organizationId, learnerId, items), page, pageSize, total };
  }

  async getCatalogById(organizationId: string, learnerId: string | null, id: string): Promise<CatalogCourse> {
    const course = await this.prisma.course.findFirst({
      where: { id, organizationId, status: 'PUBLISHED', visibility: 'PUBLIC' },
      include: INCLUDE,
    });
    if (!course) throw new NotFoundException('Course not found');
    const [withStatus] = await this.attachEnrollmentStatus(organizationId, learnerId, [course]);
    return withStatus;
  }

  /** learnerId is the caller's local User.id, or null if they have no provisioned profile yet (browsing still works — everything just reads as NOT_ENROLLED). */
  private async attachEnrollmentStatus(
    organizationId: string,
    learnerId: string | null,
    courses: CourseWithRelations[],
  ): Promise<CatalogCourse[]> {
    if (!learnerId || courses.length === 0) {
      return courses.map((c) => ({ ...c, enrollmentId: null, enrollmentStatus: 'NOT_ENROLLED' as const, isMandatory: false, dueDate: null }));
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { organizationId, userId: learnerId, courseId: { in: courses.map((c) => c.id) } },
    });
    const byCourseId = new Map(enrollments.map((e) => [e.courseId, e]));

    return courses.map((c) => {
      const enrollment = byCourseId.get(c.id);
      return {
        ...c,
        enrollmentId: enrollment?.id ?? null,
        enrollmentStatus: enrollment ? enrollment.status : ('NOT_ENROLLED' as const),
        isMandatory: enrollment?.isMandatory ?? false,
        dueDate: enrollment?.dueDate ?? null,
      };
    });
  }

  async listCategories(organizationId: string): Promise<Category[]> {
    return this.prisma.category.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  /** Never leaks whether a user id exists in a different org — 400, not 404. */
  private async assertUserInOrg(organizationId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new BadRequestException('Invalid instructor for this organization');
  }

  private categoryConnectors(organizationId: string, names: string[]) {
    return names.map((name) => ({
      where: { organizationId_name: { organizationId, name } },
      create: { organizationId, name },
    }));
  }
}
