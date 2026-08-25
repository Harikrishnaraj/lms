import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Organization, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findOwn(organizationId: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  /**
   * SECURITY-CRITICAL: the only way an organization is ever read by an
   * arbitrary id. `callerOrganizationId` comes from the verified JWT via
   * @CurrentTenant() — never from the request itself — so a caller can only
   * ever land on their own record here, regardless of what `id` they pass.
   *
   * Mismatches return NotFound rather than Forbidden: confirming that some
   * *other* organization id exists would itself leak information across the
   * tenant boundary. From the caller's perspective, another tenant's
   * organization simply does not exist.
   */
  async findByIdScoped(id: string, callerOrganizationId: string): Promise<Organization> {
    if (id !== callerOrganizationId) {
      throw new NotFoundException('Organization not found');
    }
    return this.findOwn(callerOrganizationId);
  }

  async updateOwn(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    // Confirms the row exists (and belongs to this caller) before writing.
    await this.findOwn(organizationId);
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }
}
