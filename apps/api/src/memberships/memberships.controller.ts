import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleKey } from '@lms/database';
import type { Membership } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('Memberships')
@Controller('organizations/me/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Permissions('user:view')
  @ApiOperation({ summary: "List the caller's organization members and their roles" })
  list(@CurrentTenant() organizationId: string): Promise<Membership[]> {
    return this.membershipsService.list(organizationId);
  }

  @Post()
  @Roles(RoleKey.HR_LD_ADMIN, RoleKey.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Assign (or change) a role for a user within the current organization' })
  assign(
    @CurrentTenant() organizationId: string,
    @Body() dto: AssignMembershipDto,
  ): Promise<Membership> {
    return this.membershipsService.assign(organizationId, dto.userId, dto.role);
  }

  @Delete(':userId')
  @Permissions('user:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Revoke a user's role in the current organization",
    description:
      "Scoped strictly to the caller's own organization. A userId that belongs only to a " +
      'different organization resolves as 404 — that other membership is left untouched.',
  })
  async revoke(@CurrentTenant() organizationId: string, @Param('userId') userId: string): Promise<void> {
    await this.membershipsService.revoke(organizationId, userId);
  }
}
