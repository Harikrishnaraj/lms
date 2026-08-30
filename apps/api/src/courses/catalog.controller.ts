import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Category } from '@lms/database';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { CatalogCourse, CoursesService, PaginatedCatalogCourses } from './courses.service';
import { ListCatalogQueryDto } from './dto/list-catalog.dto';

/**
 * The learner-facing course catalog (Task 13) — deliberately separate from
 * CoursesController (`organizations/me/courses`), which is the
 * trainer/admin authoring surface and returns every status/visibility. This
 * controller only ever returns PUBLIC + PUBLISHED courses, plus the calling
 * learner's own enrollment status merged onto each one. See
 * CoursesService.listCatalog / getCatalogById.
 */
@ApiTags('Catalog')
@Controller('organizations/me/catalog')
export class CatalogController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Permissions('course:read')
  @ApiOperation({ summary: 'Browse the published course catalog' })
  async list(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCatalogQueryDto,
  ): Promise<PaginatedCatalogCourses> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.coursesService.listCatalog(organizationId, learnerId, query);
  }

  @Get('categories')
  @Permissions('course:read')
  @ApiOperation({ summary: 'List categories in use, for the catalog filter dropdown' })
  listCategories(@CurrentTenant() organizationId: string): Promise<Category[]> {
    return this.coursesService.listCategories(organizationId);
  }

  @Get(':id')
  @Permissions('course:read')
  @ApiOperation({ summary: 'Retrieve a single catalog course (PUBLIC + PUBLISHED only)' })
  async getById(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CatalogCourse> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.coursesService.getCatalogById(organizationId, learnerId, id);
  }

  /** Browsing works even without a provisioned local profile — everything just reads as NOT_ENROLLED. */
  private async resolveLearnerId(organizationId: string, user: AuthenticatedUser): Promise<string | null> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    return localUser?.id ?? null;
  }
}
