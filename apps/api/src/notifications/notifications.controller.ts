import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Notification } from '@lms/database';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { EffectivePreference, NotificationsService, PaginatedNotifications } from './notifications.service';

/**
 * Task 25's in-app surface. Everything under /notifications is the
 * caller's own inbox — there is no route to read another user's
 * notifications at all, so no permission decorator is needed; the one
 * privileged action (broadcasting an announcement) carries its own.
 */
@ApiTags('Notifications')
@Controller('organizations/me/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications, newest first, with an unread count' })
  async listMine(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.notificationsService.listMine(organizationId, userId, query);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'My per-type in-app and email preferences (defaults included for types never set)' })
  async getPreferences(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EffectivePreference[]> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.notificationsService.getPreferences(organizationId, userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update my notification preferences' })
  async updatePreferences(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<EffectivePreference[]> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.notificationsService.updatePreferences(organizationId, userId, dto);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  async markAllRead(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updated: number }> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.notificationsService.markAllRead(organizationId, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.notificationsService.markRead(organizationId, userId, id);
  }

  @Post('announcements')
  @Permissions('user:manage')
  @ApiOperation({
    summary: 'Broadcast an administrative announcement',
    description: 'Fans out to every ACTIVE member of the organization, or of one department.',
  })
  broadcast(
    @CurrentTenant() organizationId: string,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<{ recipientCount: number }> {
    return this.notificationsService.broadcast(organizationId, dto);
  }

  private async resolveUserId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    if (!localUser) throw new ForbiddenException('You do not have a user profile in this organization yet');
    return localUser.id;
  }
}
