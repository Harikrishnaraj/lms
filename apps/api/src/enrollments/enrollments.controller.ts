import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { AssignEnrollmentDto } from './dto/assign-enrollment.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { EnrollmentCaller, EnrollmentWithRelations, EnrollmentsService, PaginatedEnrollments } from './enrollments.service';

@ApiTags('Enrollments')
@Controller('organizations/me/enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: "List the caller's own enrollments (My Learning)" })
  async listMine(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEnrollmentsQueryDto,
  ): Promise<PaginatedEnrollments> {
    const learnerId = await this.requireLocalUserId(organizationId, user);
    return this.enrollmentsService.listMine(organizationId, learnerId, query);
  }

  @Post('self')
  @ApiOperation({
    summary: 'Self-enroll in a course',
    description: 'Only PUBLIC, PUBLISHED courses can be self-enrolled into.',
  })
  async selfEnroll(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelfEnrollDto,
  ): Promise<EnrollmentWithRelations> {
    const learnerId = await this.requireLocalUserId(organizationId, user);
    return this.enrollmentsService.selfEnroll(organizationId, learnerId, dto.courseId);
  }

  @Post()
  @Permissions('enrollment:manage')
  @ApiOperation({
    summary: 'Assign a course to a user',
    description:
      "HR/L&D Admin and Organization Admin may assign any user in the organization. A Manager may only assign users in a department they manage.",
  })
  async assign(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignEnrollmentDto,
  ): Promise<EnrollmentWithRelations> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.enrollmentsService.assign(organizationId, caller, dto);
  }

  @Get()
  @Permissions('enrollment:manage')
  @ApiOperation({
    summary: 'List enrollments in the organization',
    description: "A Manager's results are scoped to the departments they manage.",
  })
  async list(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEnrollmentsQueryDto,
  ): Promise<PaginatedEnrollments> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.enrollmentsService.list(organizationId, caller, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve a single enrollment',
    description: "Viewable by the enrolled learner, or by staff with 'enrollment:manage' (Manager results scoped to their departments).",
  })
  async getById(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EnrollmentWithRelations> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.enrollmentsService.getById(organizationId, id, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel an enrollment',
    description:
      'A learner may cancel their own self-created, not-yet-completed enrollment. Staff with \'enrollment:manage\' may cancel any enrollment in scope.',
  })
  async cancel(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const caller = await this.resolveCaller(organizationId, user);
    await this.enrollmentsService.cancel(organizationId, id, caller);
  }

  /** Resolves role/permissions/local-profile in one place for handlers that need the full caller context. */
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

  /** For self-service handlers that require a provisioned local profile to act as the subject of the enrollment. */
  private async requireLocalUserId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    if (!localUser) {
      throw new ForbiddenException('You do not have a user profile in this organization yet');
    }
    return localUser.id;
  }
}
