import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleKey } from '@lms/database';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { AuditService, PaginatedAuditLogs } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto';

@ApiTags('Audit')
@Controller('organizations/me/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(RoleKey.ORGANIZATION_ADMIN, RoleKey.HR_LD_ADMIN)
  @ApiOperation({ summary: 'List and filter security and administrative audit trail logs' })
  list(
    @CurrentTenant() organizationId: string,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedAuditLogs> {
    return this.auditService.list(organizationId, query);
  }
}
