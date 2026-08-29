import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthorizationService } from '../authorization/authorization.service';
import { EnrollmentCaller } from '../enrollments/enrollments.service';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { MarkContentProgressDto } from './dto/mark-content-progress.dto';
import { PlayerService, PlayerView } from './player.service';

/**
 * The learner course-player (Task 15). Nested under an enrollment rather
 * than a course, because everything here — progress, resume position,
 * completion — is a property of one learner's relationship to a course,
 * not of the course itself. Access control is delegated to
 * EnrollmentsService.getById (same owner-or-in-scope-staff rule as
 * GET /enrollments/:id), so no @Permissions() decorator is needed here.
 */
@ApiTags('Course Player')
@Controller('organizations/me/enrollments/:enrollmentId')
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('player')
  @ApiOperation({ summary: 'Get the course structure, per-item progress, and resume position for an enrollment' })
  async getPlayer(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<PlayerView> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.playerService.getPlayer(organizationId, enrollmentId, caller);
  }

  @Post('content/:contentItemId/progress')
  @ApiOperation({
    summary: 'Mark a content item as started or completed',
    description: 'Also rolls the enrollment forward to IN_PROGRESS / COMPLETED as appropriate.',
  })
  async markProgress(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('contentItemId', ParseUUIDPipe) contentItemId: string,
    @Body() dto: MarkContentProgressDto,
  ): Promise<PlayerView> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.playerService.markProgress(organizationId, enrollmentId, contentItemId, caller, dto);
  }

  /** Same resolution as EnrollmentsController.resolveCaller — kept local per this codebase's convention (see CatalogController.resolveLearnerId). */
  private async resolveCaller(organizationId: string, user: AuthenticatedUser): Promise<EnrollmentCaller> {
    const [resolved, localUser] = await Promise.all([
      this.authorizationService.resolve(organizationId, user.id),
      this.usersService.findByExternalId(organizationId, user.id),
    ]);
    return {
      localUserId: localUser?.id ?? null,
      role: resolved?.role ?? null,
      permissions: resolved?.permissions ?? [],
    };
  }
}
