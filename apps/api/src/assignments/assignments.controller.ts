import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { AssignmentCaller, AssignmentsService, AssignmentWithRelations, PaginatedAssignments } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ListAssignmentsQueryDto } from './dto/list-assignments.dto';

/**
 * Task 17: bulk-assign a Course or Learning Path to a user or a whole
 * department ("team" -- see README.md). Reuses `enrollment:manage`, the
 * same permission `EnrollmentsController#assign` already uses for
 * single-user course assignment -- both HR/L&D Admin and Manager hold it,
 * exactly the two actors Task 17 names.
 */
@ApiTags('Assignments')
@Controller('organizations/me/assignments')
@Permissions('enrollment:manage')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Bulk-assign a course or learning path to a user or a department',
    description:
      "HR/L&D Admin and Organization Admin may assign to any user or department. A Manager may only target users/departments they manage.",
  })
  async create(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentWithRelations> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.assignmentsService.create(organizationId, caller, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List assignment records',
    description: "A Manager's results are scoped to assignments they created themselves.",
  })
  async list(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAssignmentsQueryDto,
  ): Promise<PaginatedAssignments> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.assignmentsService.list(organizationId, caller, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve one assignment record with its resolved recipients' })
  async getById(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentWithRelations> {
    const caller = await this.resolveCaller(organizationId, user);
    return this.assignmentsService.getById(organizationId, id, caller);
  }

  private async resolveCaller(organizationId: string, user: AuthenticatedUser): Promise<AssignmentCaller> {
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
