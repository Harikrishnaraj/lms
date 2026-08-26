import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Department, Prisma, PrismaClient, RoleKey, User, UserStatus } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const DEFAULT_PAGE_SIZE = 25;

export interface UserWithRelations extends User {
  department: Department | null;
  role: RoleKey | null;
}

export interface PaginatedUsers {
  items: UserWithRelations[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(organizationId: string, query: ListUsersQueryDto): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.UserWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Role is filtered by joining through Membership. Done as a post-filter
    // via `externalId in <subs with that role>` so pagination totals stay
    // correct — a where-clause on `memberships.some` would require Prisma
    // to return duplicate user rows for users with multiple memberships
    // (currently impossible, but the invariant may not hold in a later
    // phase when nested roles or scoped memberships arrive).
    if (query.role) {
      const memberships = await this.prisma.membership.findMany({
        where: { organizationId, role: { key: query.role } },
        select: { userId: true },
      });
      where.externalId = { in: memberships.map((m) => m.userId) };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { department: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    const enriched = await this.attachRoles(organizationId, items);
    return { items: enriched, page, pageSize, total };
  }

  async getById(organizationId: string, id: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: { department: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const [enriched] = await this.attachRoles(organizationId, [user]);
    return enriched;
  }

  async create(organizationId: string, dto: CreateUserDto): Promise<UserWithRelations> {
    if (dto.departmentId) {
      await this.assertDepartmentInOrg(organizationId, dto.departmentId);
    }

    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in the organization');
    }

    let user: User & { department: Department | null };
    try {
      user = await this.prisma.user.create({
        data: {
          organizationId,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          jobTitle: dto.jobTitle ?? null,
          departmentId: dto.departmentId ?? null,
          externalId: dto.externalId ?? null,
          status: dto.externalId ? 'ACTIVE' : 'INVITED',
        },
        include: { department: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A user with this email already exists in the organization');
      }
      throw error;
    }

    if (dto.role && dto.externalId) {
      await this.assignRole(organizationId, dto.externalId, dto.role);
    }
    if (dto.role && !dto.externalId) {
      // Can't create a Membership until we know the Auth0 sub. The desired
      // initial role is deliberately dropped rather than silently persisted
      // somewhere; document as an explicit failure so the caller sees it.
      throw new BadRequestException(
        'Cannot assign a role to an invited user before their external ID is known',
      );
    }

    const [enriched] = await this.attachRoles(organizationId, [user]);
    return enriched;
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto): Promise<UserWithRelations> {
    const existing = await this.getById(organizationId, id);

    if (dto.departmentId) {
      await this.assertDepartmentInOrg(organizationId, dto.departmentId);
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.departmentId !== undefined) {
      data.department = dto.departmentId ? { connect: { id: dto.departmentId } } : { disconnect: true };
    }

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data,
      include: { department: true },
    });

    if (dto.role !== undefined) {
      if (!existing.externalId) {
        throw new BadRequestException(
          'Cannot assign a role to a user before their external ID is known',
        );
      }
      if (dto.role === null) {
        await this.prisma.membership.deleteMany({
          where: { organizationId, userId: existing.externalId },
        });
      } else {
        await this.assignRole(organizationId, existing.externalId, dto.role);
      }
    }

    const [enriched] = await this.attachRoles(organizationId, [updated]);
    return enriched;
  }

  async setStatus(organizationId: string, id: string, status: UserStatus): Promise<UserWithRelations> {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      throw new BadRequestException('Only ACTIVE and INACTIVE are settable through this endpoint');
    }
    const user = await this.getById(organizationId, id);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status },
      include: { department: true },
    });
    const [enriched] = await this.attachRoles(organizationId, [updated]);
    return enriched;
  }

  private async assertDepartmentInOrg(organizationId: string, departmentId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) {
      // A departmentId that does not belong to this tenant should never
      // reveal whether the row exists in another org — treat it exactly
      // like a bad request, not a 404 that could be probed to enumerate
      // department ids across tenants.
      throw new BadRequestException('Invalid department for this organization');
    }
  }

  private async assignRole(organizationId: string, userId: string, roleKey: RoleKey): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
    await this.prisma.membership.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: { roleId: role.id },
      create: { organizationId, userId, roleId: role.id },
    });
  }

  private async attachRoles(
    organizationId: string,
    users: Array<User & { department: Department | null }>,
  ): Promise<UserWithRelations[]> {
    const externalIds = users
      .map((u) => u.externalId)
      .filter((id): id is string => typeof id === 'string');
    if (externalIds.length === 0) {
      return users.map((u) => ({ ...u, role: null }));
    }

    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, userId: { in: externalIds } },
      include: { role: true },
    });
    const roleByExternalId = new Map(memberships.map((m) => [m.userId, m.role.key]));

    return users.map((u) => ({
      ...u,
      role: u.externalId ? (roleByExternalId.get(u.externalId) ?? null) : null,
    }));
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
