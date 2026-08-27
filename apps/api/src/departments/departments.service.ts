import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Department, DepartmentStatus, Prisma, PrismaClient, User } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

export interface DepartmentWithRelations extends Department {
  manager: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  userCount: number;
}

@Injectable()
export class DepartmentsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(organizationId: string, includeArchived = false): Promise<DepartmentWithRelations[]> {
    const where: Prisma.DepartmentWhereInput = {
      organizationId,
      ...(includeArchived ? {} : { status: 'ACTIVE' }),
    };
    const departments = await this.prisma.department.findMany({
      where,
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    return departments.map(withUserCount);
  }

  async getById(organizationId: string, id: string): Promise<DepartmentWithRelations> {
    const department = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { users: true } } },
    });
    if (!department) throw new NotFoundException('Department not found');
    return withUserCount(department);
  }

  async create(organizationId: string, dto: CreateDepartmentDto): Promise<DepartmentWithRelations> {
    if (dto.managerId) {
      await this.assertUserInOrg(organizationId, dto.managerId);
    }
    const department = await this.prisma.department.create({
      data: { organizationId, name: dto.name, managerId: dto.managerId ?? null },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { users: true } } },
    });
    return withUserCount(department);
  }

  async update(organizationId: string, id: string, dto: UpdateDepartmentDto): Promise<DepartmentWithRelations> {
    await this.getById(organizationId, id);
    if (dto.managerId) {
      await this.assertUserInOrg(organizationId, dto.managerId);
    }

    const data: Prisma.DepartmentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.managerId !== undefined) {
      data.manager = dto.managerId ? { connect: { id: dto.managerId } } : { disconnect: true };
    }

    const department = await this.prisma.department.update({
      where: { id },
      data,
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { users: true } } },
    });
    return withUserCount(department);
  }

  async setStatus(organizationId: string, id: string, status: DepartmentStatus): Promise<DepartmentWithRelations> {
    await this.getById(organizationId, id);
    const department = await this.prisma.department.update({
      where: { id },
      data: { status },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { users: true } } },
    });
    return withUserCount(department);
  }

  /** Never leaks whether a user id exists in a different org — 400, not 404. */
  private async assertUserInOrg(organizationId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new BadRequestException('Invalid manager for this organization');
  }
}

function withUserCount(
  department: Department & {
    manager: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
    _count: { users: number };
  },
): DepartmentWithRelations {
  const { _count, ...rest } = department;
  return { ...rest, userCount: _count.users };
}
