import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient, RoleKey } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';

export interface ResolvedAuthorization {
  role: RoleKey;
  permissions: string[];
}

/**
 * The single place authorization decisions are computed. Role and permission
 * claims on the JWT (AuthenticatedUser.role / .permissions) are informational
 * only — see apps/api/src/authorization/README.md for why. Every enforcement
 * decision re-derives current role/permissions from the database, so a role
 * change or revocation takes effect on the very next request, not whenever
 * the caller's access token happens to expire.
 */
@Injectable()
export class AuthorizationService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async resolve(organizationId: string, userId: string): Promise<ResolvedAuthorization | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    if (!membership) {
      return null;
    }

    return {
      role: membership.role.key,
      permissions: membership.role.rolePermissions.map((rolePermission) => rolePermission.permission.key),
    };
  }

  async hasRole(organizationId: string, userId: string, allowedRoles: RoleKey[]): Promise<boolean> {
    const resolved = await this.resolve(organizationId, userId);
    return resolved !== null && allowedRoles.includes(resolved.role);
  }

  async hasPermissions(organizationId: string, userId: string, requiredPermissions: string[]): Promise<boolean> {
    const resolved = await this.resolve(organizationId, userId);
    if (!resolved) {
      return false;
    }
    return requiredPermissions.every((permission) => resolved.permissions.includes(permission));
  }
}
