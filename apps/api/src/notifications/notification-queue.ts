import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { NotificationType } from '@lms/database';
import { REDIS_CLIENT } from '../redis/redis.constants';

export const NOTIFICATION_QUEUE_KEY = 'lms:notifications:queue';

export interface NotificationJob {
  organizationId: string;
  /** Local User.id of the recipient. */
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
}

/**
 * Task 25's "background processing for asynchronous notification
 * delivery". A Redis list is the whole queue: producers LPUSH, the single
 * consumer (NotificationDispatcher) BRPOPs on its own blocking connection.
 * Redis is already a dependency of this app, so this costs no new package
 * and survives an API restart, which an in-process array would not.
 *
 * ponytail: at-most-once delivery — a job popped by a worker that then
 * crashes is lost, and there is no retry, backoff, or dead-letter list.
 * Notifications are advisory (the underlying enrollment/certificate is
 * already persisted before anything is enqueued), so a dropped one is
 * survivable. Move to BullMQ if delivery ever has to be guaranteed;
 * NotificationJob is the payload either way.
 */
@Injectable()
export class NotificationQueue {
  private readonly logger = new Logger(NotificationQueue.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Never throws: a notification failing to enqueue must not roll back the
   * business action that triggered it.
   */
  async push(job: NotificationJob): Promise<void> {
    try {
      await this.redis.lpush(NOTIFICATION_QUEUE_KEY, JSON.stringify(job));
    } catch (error) {
      this.logger.error(`Failed to enqueue notification for user ${job.userId}`, error as Error);
    }
  }

  /** A dedicated connection, because BRPOP blocks the one it runs on. */
  createConsumerConnection(): Redis {
    return this.redis.duplicate();
  }
}
