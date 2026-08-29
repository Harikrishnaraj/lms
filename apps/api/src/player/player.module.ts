import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

@Module({
  imports: [EnrollmentsModule, StorageModule, UsersModule, CertificatesModule],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
