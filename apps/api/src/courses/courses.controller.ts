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
import type { Category } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { CoursesService, CourseWithRelations, PaginatedCourses } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses.dto';
import { SetCourseStatusDto } from './dto/set-course-status.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Courses')
@Controller('organizations/me/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @Permissions('course:read')
  @ApiOperation({ summary: "List the caller's organization courses" })
  list(@CurrentTenant() organizationId: string, @Query() query: ListCoursesQueryDto): Promise<PaginatedCourses> {
    return this.coursesService.list(organizationId, query);
  }

  @Get('categories')
  @Permissions('course:read')
  @ApiOperation({ summary: 'List categories in use for filter dropdowns' })
  listCategories(@CurrentTenant() organizationId: string): Promise<Category[]> {
    return this.coursesService.listCategories(organizationId);
  }

  @Get(':id')
  @Permissions('course:read')
  @ApiOperation({ summary: "Retrieve a single course (scoped to the caller's organization)" })
  getById(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseWithRelations> {
    return this.coursesService.getById(organizationId, id);
  }

  @Post()
  @Permissions('course:create')
  @ApiOperation({ summary: 'Create a course (starts as DRAFT)' })
  create(@CurrentTenant() organizationId: string, @Body() dto: CreateCourseDto): Promise<CourseWithRelations> {
    return this.coursesService.create(organizationId, dto);
  }

  @Put(':id')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Edit course metadata' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseWithRelations> {
    return this.coursesService.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @Permissions('course:publish')
  @ApiOperation({ summary: 'Move a course between DRAFT, PUBLISHED, and ARCHIVED' })
  setStatus(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCourseStatusDto,
  ): Promise<CourseWithRelations> {
    return this.coursesService.setStatus(organizationId, id, dto.status);
  }
}
