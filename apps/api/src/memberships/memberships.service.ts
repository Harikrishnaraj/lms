import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Membership, PrismaClient, RoleKey } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';

@Injectable()
export class MembershipsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Always scoped to the caller's own organization — organizationId never comes from the client. */
  async list(organizationId: string): Promise<Membership[]> {
    return this.prisma.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Assigns (or reassigns) a role to `userId` within `organizationId`.
   * organizationId is always the caller's own — there is no way to target
   * another tenant's organization through this method's signature.
   */
  async assign(organizationId: string, userId: string, roleKey: RoleKey): Promise<Membership> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });

    return this.prisma.membership.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: { roleId: role.id },
      create: { organizationId, userId, roleId: role.id },
    });
  }

  /**
   * SECURITY-CRITICAL: scoped by (organizationId, userId) together, via
   * deleteMany rather than a bare delete-by-id. If `userId` is only a member
   * of a *different* organization, this matches zero rows and throws
   * NotFound — that other organization's membership is left untouched and
   * its existence is never confirmed to the caller.
   */
  async revoke(organizationId: string, userId: string): Promise<void> {
    const { count } = await this.prisma.membership.deleteMany({
      where: { organizationId, userId },
    });
    if (count === 0) {
      throw new NotFoundException('Membership not found');
    }
  }
}
