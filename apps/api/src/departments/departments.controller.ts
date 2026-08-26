import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Department } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@Controller('organizations/me/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('user:view')
  @ApiOperation({ summary: "List the caller's organization departments" })
  list(@CurrentTenant() organizationId: string): Promise<Department[]> {
    return this.departmentsService.list(organizationId);
  }
}
