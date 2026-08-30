import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { ListLearningPathsQueryDto } from './dto/list-learning-paths.dto';
import { LearningPathProgress, LearningPathsService, LearningPathWithRelations } from './learning-paths.service';

/**
 * The learner-facing learning-path experience (Task 16) -- mirrors the
 * CatalogController/CoursesController split: this only ever returns
 * PUBLISHED paths, merged with the calling learner's own progress. Gated
 * on `course:read`, which every role holds, same as the course catalog.
 */
@ApiTags('Learning Paths')
@Controller('organizations/me/learning-path-catalog')
@Permissions('course:read')
export class LearningPathCatalogController {
  constructor(
    private readonly learningPathsService: LearningPathsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Browse published learning paths' })
  async list(@CurrentTenant() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: ListLearningPathsQueryDto) {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.learningPathsService.listPublished(organizationId, learnerId, query);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the caller's own learning paths, with progress" })
  async listMine(@CurrentTenant() organizationId: string, @CurrentUser() user: AuthenticatedUser) {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    if (!learnerId) return [];
    return this.learningPathsService.listMine(organizationId, learnerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single published learning path, with the caller\'s progress' })
  async getById(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningPathWithRelations & { progress: LearningPathProgress }> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.learningPathsService.getPublishedById(organizationId, id, learnerId);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Self-enroll in a published learning path' })
  async enroll(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningPathProgress> {
    const learnerId = await this.requireLearnerId(organizationId, user);
    return this.learningPathsService.selfEnroll(organizationId, learnerId, id);
  }

  /** Browsing works even without a provisioned local profile -- everything just reads as not-enrolled, same convention as CatalogController. */
  private async resolveLearnerId(organizationId: string, user: AuthenticatedUser): Promise<string | null> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    return localUser?.id ?? null;
  }

  private async requireLearnerId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    if (!learnerId) {
      throw new ForbiddenException('You do not have a user profile in this organization yet');
    }
    return learnerId;
  }
}
