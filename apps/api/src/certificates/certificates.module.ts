import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CertificateVerificationController } from './certificate-verification.controller';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [UsersModule],
  controllers: [CertificatesController, CertificateVerificationController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
