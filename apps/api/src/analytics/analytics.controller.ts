import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import {
  AnalyticsService,
  CourseAnalyticsItem,
  DepartmentComplianceItem,
  LearnerMetrics,
  OverviewMetrics,
} from './analytics.service';
import { AnalyticsCourseQueryDto } from './dto/analytics-query.dto';

@ApiTags('Analytics')
@Controller('organizations/me/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('overview')
  @Permissions('report:view')
  @ApiOperation({ summary: 'Organization-wide high level learning and completion metrics' })
  getOverview(@CurrentTenant() organizationId: string): Promise<OverviewMetrics> {
    return this.analyticsService.getOverview(organizationId);
  }

  @Get('courses')
  @Permissions('course:read')
  @ApiOperation({ summary: 'Per-course enrollment, completion, and quiz grade metrics' })
  getCourseAnalytics(
    @CurrentTenant() organizationId: string,
    @Query() query: AnalyticsCourseQueryDto,
  ): Promise<CourseAnalyticsItem[]> {
    return this.analyticsService.getCourseAnalytics(organizationId, query);
  }

  @Get('departments')
  @Permissions('report:view')
  @ApiOperation({ summary: 'Departmental compliance rates and mandatory training completion' })
  getDepartmentCompliance(
    @CurrentTenant() organizationId: string,
  ): Promise<DepartmentComplianceItem[]> {
    return this.analyticsService.getDepartmentCompliance(organizationId);
  }

  @Get('learner')
  @ApiOperation({ summary: 'Caller learning progress metrics and certificates summary' })
  async getLearnerAnalytics(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LearnerMetrics> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    return this.analyticsService.getLearnerAnalytics(organizationId, localUser?.id ?? user.id);
  }
}
