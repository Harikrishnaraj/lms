import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort, UploadTarget } from '../storage.port';

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * Talks to any S3-compatible endpoint (AWS S3, MinIO, Cloudflare R2, ...) via
 * presigned URLs — the client uploads/downloads directly, this API never
 * proxies the bytes. Configuring S3_ENDPOINT points this at a non-AWS
 * provider without any code change.
 *
 * Nest instantiates this provider even when STORAGE_PROVIDER=local (it's a
 * factory dependency in StorageModule alongside LocalDiskStorageProvider),
 * so nothing here may require S3 config at construction time — only when an
 * operation actually runs. `validateEnv` already refuses to boot at all if
 * STORAGE_PROVIDER=s3 and the config is missing.
 */
@Injectable()
export class S3StorageProvider implements StoragePort {
  private client: S3Client | undefined;
  private bucket: string | undefined;

  constructor(private readonly configService: ConfigService) {}

  async createUploadTarget(key: string, contentType: string): Promise<UploadTarget> {
    const objectKey = key || randomUUID();
    const command = new PutObjectCommand({ Bucket: this.getBucket(), Key: objectKey, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
    return { key: objectKey, uploadUrl, headers: { 'Content-Type': contentType } };
  }

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.getBucket(), Key: key });
    return getSignedUrl(this.getClient(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  }

  async deleteObject(key: string): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.getBucket(), Key: key }));
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.require('S3_REGION'),
        endpoint: this.configService.get<string>('S3_ENDPOINT'),
        forcePathStyle: !!this.configService.get<string>('S3_ENDPOINT'),
        credentials: {
          accessKeyId: this.require('S3_ACCESS_KEY_ID'),
          secretAccessKey: this.require('S3_SECRET_ACCESS_KEY'),
        },
      });
    }
    return this.client;
  }

  private getBucket(): string {
    return (this.bucket ??= this.require('S3_BUCKET'));
  }

  private require(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`Missing required storage configuration: ${key}`);
    return value;
  }
}
