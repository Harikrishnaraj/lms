import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailPort } from '../email.port';

/**
 * The only EmailPort implementation right now: it logs the message instead
 * of sending it.
 *
 * ponytail: no real transport. A second provider (SES/SendGrid/SMTP) plugs
 * in behind EMAIL_PORT in notifications.module.ts the same way
 * S3StorageProvider does behind STORAGE_PORT — add it when there is a
 * deployment that actually needs mail to leave the box, not before.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailPort {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`email -> ${message.to}: ${message.subject}`);
  }
}
