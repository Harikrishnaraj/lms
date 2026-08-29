import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationPreference, NotificationType, Prisma, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { EMAIL_PORT, EmailPort } from './email/email.port';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationJob, NotificationQueue } from './notification-queue';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

const DEFAULT_PAGE_SIZE = 25;

/** Every type, so the preferences screen can render a complete list without a round-trip per type. */
export const NOTIFICATION_TYPES: NotificationType[] = [
  'COURSE_ASSIGNED',
  'ASSESSMENT_RESULT',
  'COURSE_COMPLETED',
  'CERTIFICATE_ISSUED',
  'ANNOUNCEMENT',
];

export interface PaginatedNotifications {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}

export interface EffectivePreference {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

/**
 * Task 25. Producers call `enqueue` (fire-and-forget, never blocks or
 * fails the business action that triggered it); NotificationDispatcher
 * calls `deliver` off the queue. The split matters: `deliver` is the only
 * thing that writes a Notification row or touches the EmailPort, so
 * preference checks live in exactly one place.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    private readonly queue: NotificationQueue,
  ) {}

  /** Producer side. Returns immediately; delivery happens on the queue worker. */
  async enqueue(job: NotificationJob): Promise<void> {
    await this.queue.push(job);
  }

  /** Convenience for the fan-out cases (an assignment to a whole department). */
  async enqueueMany(jobs: NotificationJob[]): Promise<void> {
    await Promise.all(jobs.map((job) => this.queue.push(job)));
  }

  /**
   * Consumer side. Honours the recipient's per-type channel preferences;
   * an absent preference row means both channels are on (see the schema
   * docblock on NotificationPreference).
   */
  async deliver(job: NotificationJob): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: job.userId, organizationId: job.organizationId },
      select: { id: true, email: true, firstName: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return;

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { organizationId_userId_type: { organizationId: job.organizationId, userId: job.userId, type: job.type } },
    });
    const inApp = preference?.inApp ?? true;
    const email = preference?.email ?? true;

    if (inApp) {
      await this.prisma.notification.create({
        data: {
          organizationId: job.organizationId,
          userId: job.userId,
          type: job.type,
          title: job.title,
          body: job.body,
          linkUrl: job.linkUrl ?? null,
        },
      });
    }

    if (email) {
      try {
        await this.email.send({ to: user.email, subject: job.title, body: job.body });
      } catch (error) {
        // The in-app copy is already persisted; a provider outage must not
        // take the worker down or lose the rest of the batch.
        this.logger.error(`Email delivery failed for user ${job.userId}`, error as Error);
      }
    }
  }

  // ---- In-app inbox ----

  async listMine(organizationId: string, userId: string, query: ListNotificationsQueryDto): Promise<PaginatedNotifications> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { organizationId, userId, readAt: null } }),
    ]);

    return { items, page, pageSize, total, unreadCount };
  }

  async markRead(organizationId: string, userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({ where: { id, organizationId, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.readAt) return notification;
    return this.prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  }

  async markAllRead(organizationId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ---- Preferences ----

  async getPreferences(organizationId: string, userId: string): Promise<EffectivePreference[]> {
    const rows = await this.prisma.notificationPreference.findMany({ where: { organizationId, userId } });
    const byType = new Map(rows.map((row) => [row.type, row]));
    return NOTIFICATION_TYPES.map((type) => ({
      type,
      inApp: byType.get(type)?.inApp ?? true,
      email: byType.get(type)?.email ?? true,
    }));
  }

  async updatePreferences(
    organizationId: string,
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<EffectivePreference[]> {
    for (const preference of dto.preferences) {
      await this.prisma.notificationPreference.upsert({
        where: { organizationId_userId_type: { organizationId, userId, type: preference.type } },
        update: { inApp: preference.inApp, email: preference.email },
        create: {
          organizationId,
          userId,
          type: preference.type,
          inApp: preference.inApp,
          email: preference.email,
        },
      });
    }
    return this.getPreferences(organizationId, userId);
  }

  // ---- Administrative announcement ----

  /**
   * Fans an announcement out to every ACTIVE member of the organization,
   * or of one department. Enqueues rather than writing rows inline so a
   * 5,000-person org doesn't block the admin's request.
   */
  async broadcast(
    organizationId: string,
    input: { title: string; body: string; departmentId?: string; linkUrl?: string | null },
  ): Promise<{ recipientCount: number }> {
    const recipients = await this.prisma.user.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      select: { id: true },
    });

    await this.enqueueMany(
      recipients.map((recipient) => ({
        organizationId,
        userId: recipient.id,
        type: 'ANNOUNCEMENT' as NotificationType,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
      })),
    );

    return { recipientCount: recipients.length };
  }
}

export type { NotificationPreference };
