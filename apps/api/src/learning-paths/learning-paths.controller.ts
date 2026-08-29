import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { AddLearningPathCourseDto } from './dto/add-learning-path-course.dto';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { ListLearningPathsQueryDto } from './dto/list-learning-paths.dto';
import { ReorderLearningPathCoursesDto } from './dto/reorder-learning-path-courses.dto';
import { SetLearningPathStatusDto } from './dto/set-learning-path-status.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { LearningPathsService, LearningPathWithRelations, PaginatedLearningPaths } from './learning-paths.service';

/**
 * Admin/L&D authoring surface (Task 16) -- deliberately separate from
 * LearningPathCatalogController (`organizations/me/learning-path-catalog`),
 * which is the learner-facing browse/join surface and only ever returns
 * PUBLISHED paths. Everything here requires `learning-path:manage`, which
 * only HR/L&D Admin and Organization Admin hold (see seed.ts) -- narrower
 * than the courses admin surface's `course:read` gate, since Task 16 scopes
 * this to "Admin/L&D management" only.
 */
@ApiTags('Learning Paths')
@Controller('organizations/me/learning-paths')
@Permissions('learning-path:manage')
export class LearningPathsController {
  constructor(
    private readonly learningPathsService: LearningPathsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List learning paths (any status)' })
  list(@CurrentTenant() organizationId: string, @Query() query: ListLearningPathsQueryDto): Promise<PaginatedLearningPaths> {
    return this.learningPathsService.list(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single learning path (any status)' })
  getById(@CurrentTenant() organizationId: string, @Param('id', ParseUUIDPipe) id: string): Promise<LearningPathWithRelations> {
    return this.learningPathsService.getById(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a learning path (starts as DRAFT)' })
  async create(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningPathDto,
  ): Promise<LearningPathWithRelations> {
    const createdById = await this.requireLocalUserId(organizationId, user);
    return this.learningPathsService.create(organizationId, createdById, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a learning path\'s title/description' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningPathDto,
  ): Promise<LearningPathWithRelations> {
    return this.learningPathsService.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Publish or archive a learning path',
    description: 'Publishing requires at least one course, and every REQUIRED course must itself be published.',
  })
  setStatus(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetLearningPathStatusDto,
  ): Promise<LearningPathWithRelations> {
    return this.learningPathsService.setStatus(organizationId, id, dto.status);
  }

  @Post(':id/courses')
  @ApiOperation({ summary: 'Add a course to the path' })
  addCourse(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLearningPathCourseDto,
  ): Promise<LearningPathWithRelations> {
    return this.learningPathsService.addCourse(organizationId, id, dto);
  }

  @Delete(':id/courses/:courseId')
  @ApiOperation({ summary: 'Remove a course from the path' })
  removeCourse(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<LearningPathWithRelations> {
    return this.learningPathsService.removeCourse(organizationId, id, courseId);
  }

  @Patch(':id/courses/reorder')
  @ApiOperation({ summary: 'Reorder the path\'s courses (submit every course id, in the new order)' })
  reorderCourses(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderLearningPathCoursesDto,
  ): Promise<LearningPathWithRelations> {
    return this.learningPathsService.reorderCourses(organizationId, id, dto);
  }

  private async requireLocalUserId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    if (!localUser) {
      throw new ForbiddenException('You do not have a user profile in this organization yet');
    }
    return localUser.id;
  }
}
