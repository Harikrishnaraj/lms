import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { AssessmentForLearner, AssessmentsService, AttemptResult, MyAttemptSummary } from './assessments.service';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

/**
 * The learner half of Tasks 18/19. Deliberately a separate controller from
 * AssessmentsController so the answer key can never leak through a shared
 * route: nothing here returns a `correctIndex`, and the only write is a
 * submission that is graded server-side.
 *
 * No `@Permissions()` — every authenticated member of the organization may
 * take an assessment they have access to; per-assessment access (enrolled
 * in the owning course) is enforced in the service.
 */
@ApiTags('Assessments (learner)')
@Controller('organizations/me/my-assessments')
export class LearnerAssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my assessment attempts, newest first' })
  async listMine(@CurrentTenant() organizationId: string, @CurrentUser() user: AuthenticatedUser): Promise<MyAttemptSummary[]> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.assessmentsService.listMyAttempts(organizationId, learnerId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an assessment to take',
    description: 'Questions and options only — correct answers are never included before grading.',
  })
  async getForLearner(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentForLearner> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.assessmentsService.getForLearner(organizationId, id, learnerId);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit answers and receive the graded result',
    description: 'Rejected if the attempt limit is exhausted, the assessment was already passed, or the answer set is incomplete.',
  })
  async submit(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAssessmentDto,
  ): Promise<AttemptResult & { totalPoints: number; earnedPoints: number }> {
    const learnerId = await this.resolveLearnerId(organizationId, user);
    return this.assessmentsService.submit(organizationId, id, learnerId, dto);
  }

  /** Same pattern as CatalogController.resolveLearnerId — kept local per this codebase's convention. */
  private async resolveLearnerId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    if (!localUser) throw new ForbiddenException('You do not have a user profile in this organization yet');
    return localUser.id;
  }
}
