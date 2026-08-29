import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { NOTIFICATION_QUEUE_KEY, NotificationJob, NotificationQueue } from './notification-queue';
import { NotificationsService } from './notifications.service';

const BRPOP_TIMEOUT_SECONDS = 5;

/**
 * The queue worker. Runs in-process alongside the API — one BRPOP loop on
 * its own Redis connection — rather than as a separate deployable, which
 * would be a second thing to run for a workload of a few hundred rows a
 * day.
 *
 * ponytail: in-process worker, so N API replicas means N workers competing
 * on the same list (which is correct — BRPOP hands each job to exactly one
 * of them) but also means notification throughput is coupled to API
 * capacity. Split it out into its own process when that stops being true.
 */
@Injectable()
export class NotificationDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private connection: Redis | null = null;
  private running = false;

  constructor(
    private readonly queue: NotificationQueue,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.running = true;
    this.connection = this.queue.createConsumerConnection();
    void this.loop();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.connection?.quit().catch(() => undefined);
    this.connection = null;
  }

  private async loop(): Promise<void> {
    while (this.running && this.connection) {
      try {
        // Times out rather than blocking forever, so shutdown never has to
        // wait on an idle queue for longer than BRPOP_TIMEOUT_SECONDS.
        const popped = await this.connection.brpop(NOTIFICATION_QUEUE_KEY, BRPOP_TIMEOUT_SECONDS);
        if (!popped) continue;
        const job = JSON.parse(popped[1]) as NotificationJob;
        await this.notificationsService.deliver(job);
      } catch (error) {
        if (!this.running) return;
        this.logger.error('Notification dispatch failed', error as Error);
        // Back off briefly so a hard Redis outage doesn't spin the loop.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
