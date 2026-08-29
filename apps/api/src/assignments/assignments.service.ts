import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Assignment, Prisma, PrismaClient, RoleKey, User } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { LearningPathsService } from '../learning-paths/learning-paths.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ListAssignmentsQueryDto } from './dto/list-assignments.dto';

const DEFAULT_PAGE_SIZE = 25;

type CourseRef = { id: string; title: string };
type LearningPathRef = { id: string; title: string };
type DepartmentRef = { id: string; name: string };
type UserRef = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export interface AssignmentWithRelations extends Assignment {
  course: CourseRef | null;
  learningPath: LearningPathRef | null;
  department: DepartmentRef | null;
  targetUser: UserRef | null;
  createdBy: UserRef;
  recipients: UserRef[];
}

export interface PaginatedAssignments {
  items: AssignmentWithRelations[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssignmentCaller {
  localUserId: string | null;
  role: RoleKey | null;
  permissions: string[];
}

const INCLUDE = {
  course: { select: { id: true, title: true } },
  learningPath: { select: { id: true, title: true } },
  department: { select: { id: true, name: true } },
  targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.AssignmentInclude;

/**
 * Task 17. A generic bulk-assignment surface over both Courses and
 * Learning Paths -- the roadmap batches these two tasks together because
 * "Assignments is really bulk-create Enrollments with a source/scope," and
 * a Learning Path is just another kind of enrollable target once Task 16
 * exists. This is a deliberate scope extension beyond Task 17's literal
 * "assign course" wording; see README.md.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly learningPathsService: LearningPathsService,
  ) {}

  async create(organizationId: string, caller: AssignmentCaller, dto: CreateAssignmentDto): Promise<AssignmentWithRelations> {
    if (!caller.localUserId) {
      throw new ForbiddenException('You do not have a user profile in this organization yet');
    }
    this.validateShape(dto);

    if (dto.targetType === 'COURSE') {
      const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId } });
      if (!course) throw new BadRequestException('Invalid course for this organization');
      if (course.status !== 'PUBLISHED') throw new BadRequestException('Only published courses can be assigned');
    } else {
      const path = await this.prisma.learningPath.findFirst({ where: { id: dto.learningPathId, organizationId } });
      if (!path) throw new BadRequestException('Invalid learning path for this organization');
      if (path.status !== 'PUBLISHED') throw new BadRequestException('Only published learning paths can be assigned');
    }

    const recipients = await this.resolveRecipients(organizationId, caller, dto);
    if (recipients.length === 0) {
      throw new BadRequestException('No eligible recipients were found for that scope');
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const isMandatory = dto.isMandatory ?? false;
    const source = caller.role === 'MANAGER' ? 'MANAGER' : 'ADMIN';

    for (const recipient of recipients) {
      if (dto.targetType === 'COURSE') {
        await this.enrollmentsService.upsertAssignedEnrollment(organizationId, recipient.id, dto.courseId!, {
          source,
          assignedById: caller.localUserId,
          isMandatory,
          dueDate,
        });
      } else {
        await this.learningPathsService.assignPath(organizationId, recipient.id, dto.learningPathId!, {
          source,
          assignedById: caller.localUserId,
          isMandatory,
          dueDate,
        });
      }
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        organizationId,
        targetType: dto.targetType,
        courseId: dto.targetType === 'COURSE' ? dto.courseId : null,
        learningPathId: dto.targetType === 'LEARNING_PATH' ? dto.learningPathId : null,
        scopeType: dto.scopeType,
        userId: dto.scopeType === 'USER' ? dto.userId : null,
        departmentId: dto.scopeType === 'DEPARTMENT' ? dto.departmentId : null,
        isMandatory,
        dueDate,
        createdById: caller.localUserId,
        recipientCount: recipients.length,
      },
      include: INCLUDE,
    });
    return { ...assignment, recipients };
  }

  async list(organizationId: string, caller: AssignmentCaller, query: ListAssignmentsQueryDto): Promise<PaginatedAssignments> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.AssignmentWhereInput = {
      organizationId,
      ...(caller.role === 'MANAGER' ? { createdById: caller.localUserId ?? '__none__' } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.assignment.count({ where }),
    ]);
    const items = rows.map((row) => ({ ...row, recipients: [] as UserRef[] }));
    return { items, page, pageSize, total };
  }

  async getById(organizationId: string, id: string, caller: AssignmentCaller): Promise<AssignmentWithRelations> {
    const assignment = await this.prisma.assignment.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (caller.role === 'MANAGER' && assignment.createdById !== caller.localUserId) {
      throw new ForbiddenException('You can only view assignments you created');
    }
    const recipients = await this.recipientsFor(organizationId, assignment);
    return { ...assignment, recipients };
  }

  private validateShape(dto: CreateAssignmentDto): void {
    if (dto.targetType === 'COURSE' && (!dto.courseId || dto.learningPathId)) {
      throw new BadRequestException('targetType COURSE requires courseId and no learningPathId');
    }
    if (dto.targetType === 'LEARNING_PATH' && (!dto.learningPathId || dto.courseId)) {
      throw new BadRequestException('targetType LEARNING_PATH requires learningPathId and no courseId');
    }
    if (dto.scopeType === 'USER' && (!dto.userId || dto.departmentId)) {
      throw new BadRequestException('scopeType USER requires userId and no departmentId');
    }
    if (dto.scopeType === 'DEPARTMENT' && (!dto.departmentId || dto.userId)) {
      throw new BadRequestException('scopeType DEPARTMENT requires departmentId and no userId');
    }
  }

  private async resolveRecipients(organizationId: string, caller: AssignmentCaller, dto: CreateAssignmentDto): Promise<UserRef[]> {
    if (dto.scopeType === 'USER') {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, organizationId },
        select: { id: true, firstName: true, lastName: true, email: true, departmentId: true, status: true },
      });
      if (!user) throw new BadRequestException('Invalid user for this organization');
      if (caller.role === 'MANAGER') {
        const managedDepartmentIds = await this.managedDepartmentIds(organizationId, caller.localUserId!);
        if (!user.departmentId || !managedDepartmentIds.includes(user.departmentId)) {
          throw new ForbiddenException('That user is outside your managed scope');
        }
      }
      return [{ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }];
    }

    const department = await this.prisma.department.findFirst({ where: { id: dto.departmentId, organizationId } });
    if (!department) throw new BadRequestException('Invalid department for this organization');
    if (caller.role === 'MANAGER' && department.managerId !== caller.localUserId) {
      throw new ForbiddenException('That department is outside your managed scope');
    }

    // ACTIVE only -- an assignment shouldn't create enrollment obligations
    // for an inactive/off-boarded member (see README.md).
    return this.prisma.user.findMany({
      where: { organizationId, departmentId: dto.departmentId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  private async recipientsFor(organizationId: string, assignment: Assignment): Promise<UserRef[]> {
    if (assignment.scopeType === 'USER') {
      const user = await this.prisma.user.findFirst({
        where: { id: assignment.userId ?? undefined, organizationId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      return user ? [user] : [];
    }
    return this.prisma.user.findMany({
      where: { organizationId, departmentId: assignment.departmentId ?? undefined, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  private async managedDepartmentIds(organizationId: string, managerLocalUserId: string): Promise<string[]> {
    const departments = await this.prisma.department.findMany({
      where: { organizationId, managerId: managerLocalUserId },
      select: { id: true },
    });
    return departments.map((d) => d.id);
  }
}
