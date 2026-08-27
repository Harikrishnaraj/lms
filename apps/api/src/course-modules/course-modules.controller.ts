import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Module } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { CourseModulesService } from './course-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@ApiTags('Course Modules')
@Controller('organizations/me/courses/:courseId/modules')
export class CourseModulesController {
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @Get()
  @Permissions('course:read')
  @ApiOperation({ summary: 'List a course\'s modules, in order' })
  list(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Module[]> {
    return this.courseModulesService.list(organizationId, courseId);
  }

  @Post()
  @Permissions('course:update')
  @ApiOperation({ summary: 'Create a module, appended to the end of the course' })
  create(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateModuleDto,
  ): Promise<Module> {
    return this.courseModulesService.create(organizationId, courseId, dto);
  }

  @Put(':moduleId')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Rename a module' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ): Promise<Module> {
    return this.courseModulesService.update(organizationId, courseId, moduleId, dto);
  }

  @Patch('reorder')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Reorder every module in the course' })
  reorder(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: ReorderModulesDto,
  ): Promise<Module[]> {
    return this.courseModulesService.reorder(organizationId, courseId, dto);
  }
}
