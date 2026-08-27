import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { SetDepartmentStatusDto } from './dto/set-department-status.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService, DepartmentWithRelations } from './departments.service';

@ApiTags('Departments')
@Controller('organizations/me/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('user:view')
  @ApiOperation({ summary: "List the caller's organization departments" })
  list(
    @CurrentTenant() organizationId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<DepartmentWithRelations[]> {
    return this.departmentsService.list(organizationId, includeArchived === 'true');
  }

  @Get(':id')
  @Permissions('user:view')
  @ApiOperation({ summary: 'Retrieve a single department (scoped to the caller\'s organization)' })
  getById(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DepartmentWithRelations> {
    return this.departmentsService.getById(organizationId, id);
  }

  @Post()
  @Permissions('user:manage')
  @ApiOperation({ summary: 'Create a department' })
  create(
    @CurrentTenant() organizationId: string,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentWithRelations> {
    return this.departmentsService.create(organizationId, dto);
  }

  @Put(':id')
  @Permissions('user:manage')
  @ApiOperation({ summary: "Rename a department or change its manager" })
  update(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentWithRelations> {
    return this.departmentsService.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @Permissions('user:manage')
  @ApiOperation({ summary: 'Archive or restore a department' })
  setStatus(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetDepartmentStatusDto,
  ): Promise<DepartmentWithRelations> {
    return this.departmentsService.setStatus(organizationId, id, dto.status);
  }
}
