import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalDiskStorageProvider } from './providers/local-disk-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { STORAGE_PORT } from './storage.port';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [
    LocalDiskStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PORT,
      useFactory: (configService: ConfigService, local: LocalDiskStorageProvider, s3: S3StorageProvider) =>
        configService.get<string>('STORAGE_PROVIDER') === 's3' ? s3 : local,
      inject: [ConfigService, LocalDiskStorageProvider, S3StorageProvider],
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
