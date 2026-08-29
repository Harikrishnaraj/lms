import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ConsoleEmailProvider } from './email/providers/console-email.provider';
import { EMAIL_PORT } from './email/email.port';
import { NotificationDispatcher } from './notification-dispatcher';
import { NotificationQueue } from './notification-queue';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Global because almost every other feature module is a notification
 * *producer* (assignments, assessments, player, certificates) — importing
 * it everywhere would be noise, and the alternative (an event bus) is a
 * layer nothing here needs yet. Same call RedisModule and
 * AuthorizationModule already make.
 */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueue,
    NotificationDispatcher,
    ConsoleEmailProvider,
    { provide: EMAIL_PORT, useExisting: ConsoleEmailProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
