import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Course, Enrollment, Prisma, PrismaClient, RoleKey, User } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { AssignEnrollmentDto } from './dto/assign-enrollment.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments.dto';

const DEFAULT_PAGE_SIZE = 25;

type CourseRef = Pick<Course, 'id' | 'title' | 'status' | 'visibility' | 'durationMinutes' | 'difficulty'>;
type UserRef = Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'departmentId'>;
type AssignerRef = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export interface EnrollmentWithRelations extends Enrollment {
  course: CourseRef;
  user: UserRef;
  assignedBy: AssignerRef | null;
}

export interface PaginatedEnrollments {
  items: EnrollmentWithRelations[];
  page: number;
  pageSize: number;
  total: number;
}

/** The caller's resolved identity, passed down from the controller so the
 *  service never has to re-derive "who is asking" from raw request state. */
export interface EnrollmentCaller {
  /** Local User.id, or null if the caller has no provisioned profile yet. */
  localUserId: string | null;
  role: RoleKey | null;
  permissions: string[];
}

const INCLUDE = {
  course: { select: { id: true, title: true, status: true, visibility: true, durationMinutes: true, difficulty: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true, departmentId: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.EnrollmentInclude;

@Injectable()
export class EnrollmentsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Self-enrollment (Task 14). Only PUBLIC + PUBLISHED courses are open to
   * it — everything else requires an admin/manager assignment, matching the
   * schema comment on Course.visibility.
   */
  async selfEnroll(organizationId: string, learnerId: string, courseId: string): Promise<EnrollmentWithRelations> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.status !== 'PUBLISHED' || course.visibility !== 'PUBLIC') {
      throw new BadRequestException('This course is not open for self-enrollment');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { organizationId_userId_courseId: { organizationId, userId: learnerId, courseId } },
    });
    if (existing) throw new ConflictException('You are already enrolled in this course');

    return this.prisma.enrollment.create({
      data: { organizationId, userId: learnerId, courseId, source: 'SELF', isMandatory: false },
      include: INCLUDE,
    });
  }

  /**
   * Admin or manager assignment (Task 14). `caller.role` decides the
   * scoping rule:
   *  - HR_LD_ADMIN / ORGANIZATION_ADMIN: any user, any published course.
   *  - MANAGER: only users in a department this manager manages
   *    (Department.managerId), per TRD/Task 22 manager-scope rules.
   * Upserts rather than erroring on a repeat assignment — reassigning a due
   * date or mandatory flag to an already-enrolled learner is a normal
   * workflow, not a conflict.
   */
  async assign(organizationId: string, caller: EnrollmentCaller, dto: AssignEnrollmentDto): Promise<EnrollmentWithRelations> {
    if (!caller.localUserId) {
      throw new ForbiddenException('You do not have a user profile in this organization yet');
    }

    const targetUser = await this.prisma.user.findFirst({ where: { id: dto.userId, organizationId } });
    if (!targetUser) {
      // Never leaks whether the id exists in a different org.
      throw new BadRequestException('Invalid user for this organization');
    }

    if (caller.role === 'MANAGER') {
      await this.assertManagerScope(organizationId, caller.localUserId, targetUser);
    }

    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId } });
    if (!course) throw new BadRequestException('Invalid course for this organization');
    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published courses can be assigned');
    }

    const source = caller.role === 'MANAGER' ? 'MANAGER' : 'ADMIN';

    return this.prisma.enrollment.upsert({
      where: { organizationId_userId_courseId: { organizationId, userId: dto.userId, courseId: dto.courseId } },
      update: {
        isMandatory: dto.isMandatory,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        source,
        assignedById: caller.localUserId,
      },
      create: {
        organizationId,
        userId: dto.userId,
        courseId: dto.courseId,
        isMandatory: dto.isMandatory ?? false,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        source,
        assignedById: caller.localUserId,
      },
      include: INCLUDE,
    });
  }

  /**
   * Internal upsert used by LearningPathsService (path join/assignment
   * cascading to each REQUIRED member course) and AssignmentsService
   * (direct course assignment). Deliberately skips the PUBLIC-visibility
   * gate that `selfEnroll` enforces -- a path or a staff assignment may
   * legitimately target a PRIVATE course, same as `assign()` already does
   * for a single user. Mirrors `assign()`'s update semantics exactly (a
   * later assignment always wins on isMandatory/dueDate/source/assignedBy),
   * so cascading a path assignment onto an already self-enrolled learner
   * behaves the same way a direct re-assignment would.
   */
  async upsertAssignedEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
    opts: { source: 'SELF' | 'ADMIN' | 'MANAGER'; assignedById: string | null; isMandatory: boolean; dueDate: Date | null },
  ): Promise<Enrollment> {
    return this.prisma.enrollment.upsert({
      where: { organizationId_userId_courseId: { organizationId, userId, courseId } },
      update: {
        isMandatory: opts.isMandatory,
        dueDate: opts.dueDate,
        source: opts.source,
        assignedById: opts.assignedById,
      },
      create: {
        organizationId,
        userId,
        courseId,
        isMandatory: opts.isMandatory,
        dueDate: opts.dueDate,
        source: opts.source,
        assignedById: opts.assignedById,
      },
    });
  }

  async listMine(organizationId: string, learnerId: string, query: ListEnrollmentsQueryDto): Promise<PaginatedEnrollments> {
    return this.paginate(
      { organizationId, userId: learnerId, ...(query.status ? { status: query.status } : {}) },
      query,
    );
  }

  /** Staff listing (`enrollment:manage`), manager-scoped by the controller-resolved caller. */
  async list(organizationId: string, caller: EnrollmentCaller, query: ListEnrollmentsQueryDto): Promise<PaginatedEnrollments> {
    const where: Prisma.EnrollmentWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
    };

    if (caller.role === 'MANAGER') {
      if (!caller.localUserId) {
        throw new ForbiddenException('You do not have a user profile in this organization yet');
      }
      const managedDepartmentIds = await this.managedDepartmentIds(organizationId, caller.localUserId);
      if (query.departmentId && !managedDepartmentIds.includes(query.departmentId)) {
        throw new ForbiddenException('That department is outside your managed scope');
      }
      where.user = { departmentId: { in: query.departmentId ? [query.departmentId] : managedDepartmentIds } };
    } else if (query.departmentId) {
      where.user = { departmentId: query.departmentId };
    }

    return this.paginate(where, query);
  }

  async getById(organizationId: string, id: string, caller: EnrollmentCaller): Promise<EnrollmentWithRelations> {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.assertViewable(organizationId, enrollment, caller);
    return enrollment;
  }

  /**
   * Self-cancellation is limited to enrollments the learner created
   * themselves and hasn't completed — you can't un-enroll from a course an
   * admin/manager mandated for you, or discard a completed record. Staff
   * with `enrollment:manage` can cancel any enrollment in scope.
   */
  async cancel(organizationId: string, id: string, caller: EnrollmentCaller): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const isOwner = caller.localUserId !== null && enrollment.userId === caller.localUserId;
    const isStaff = caller.permissions.includes('enrollment:manage');

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot cancel another learner\'s enrollment');
    }
    if (isOwner && !isStaff) {
      // Self-service cancellation: only your own, self-created, not-yet-completed enrollments.
      if (enrollment.source !== 'SELF') {
        throw new ForbiddenException('This enrollment was assigned to you and cannot be self-cancelled');
      }
      if (enrollment.status === 'COMPLETED') {
        throw new ForbiddenException('A completed enrollment cannot be cancelled');
      }
    }
    if (!isOwner && isStaff) {
      await this.assertViewable(organizationId, enrollment, caller);
    }
    // isOwner && isStaff: staff acting on their own enrollment — no extra restriction.

    await this.prisma.enrollment.delete({ where: { id: enrollment.id } });
  }

  private async assertViewable(
    organizationId: string,
    enrollment: EnrollmentWithRelations,
    caller: EnrollmentCaller,
  ): Promise<void> {
    if (caller.localUserId && enrollment.userId === caller.localUserId) return;

    if (!caller.permissions.includes('enrollment:manage')) {
      throw new ForbiddenException('You do not have access to this enrollment');
    }
    if (caller.role === 'MANAGER') {
      if (!caller.localUserId) {
        throw new ForbiddenException('You do not have a user profile in this organization yet');
      }
      const managedDepartmentIds = await this.managedDepartmentIds(organizationId, caller.localUserId);
      if (!enrollment.user.departmentId || !managedDepartmentIds.includes(enrollment.user.departmentId)) {
        throw new ForbiddenException('That learner is outside your managed scope');
      }
    }
  }

  private async assertManagerScope(organizationId: string, managerLocalUserId: string, targetUser: User): Promise<void> {
    const managedDepartmentIds = await this.managedDepartmentIds(organizationId, managerLocalUserId);
    if (!targetUser.departmentId || !managedDepartmentIds.includes(targetUser.departmentId)) {
      throw new ForbiddenException('That user is outside your managed scope');
    }
  }

  private async managedDepartmentIds(organizationId: string, managerLocalUserId: string): Promise<string[]> {
    const departments = await this.prisma.department.findMany({
      where: { organizationId, managerId: managerLocalUserId },
      select: { id: true },
    });
    return departments.map((d) => d.id);
  }

  private async paginate(
    where: Prisma.EnrollmentWhereInput,
    query: { page?: number; pageSize?: number },
  ): Promise<PaginatedEnrollments> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const [items, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }
}
