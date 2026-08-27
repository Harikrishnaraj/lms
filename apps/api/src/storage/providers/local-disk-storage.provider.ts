import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort, UploadTarget } from '../storage.port';

/**
 * Dev-only storage backing disk instead of a real object store. The upload
 * "URL" points at this API's own /uploads/objects/:key endpoint rather than
 * a true presigned URL, and the client sends the file as base64 JSON rather
 * than a raw PUT body.
 *
 * ponytail: base64-over-JSON, not a real streamed/multipart body — fine for
 * local dev and small course assets, wrong for production. Swap
 * STORAGE_PROVIDER=s3 (real presigned PUT, no size ceiling from this) once
 * actually deploying; that's the upgrade path, not a change to this
 * interface.
 */
@Injectable()
export class LocalDiskStorageProvider implements StoragePort {
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseDir = path.resolve(this.configService.get<string>('STORAGE_LOCAL_DIR') ?? './.data/uploads');
  }

  // contentType is sent by the client in the PUT body itself (see
  // uploads.controller.ts), not needed to construct the target URL here.
  async createUploadTarget(key: string): Promise<UploadTarget> {
    const objectKey = key || randomUUID();
    return {
      key: objectKey,
      uploadUrl: `/api/v1/uploads/objects/${encodeURIComponent(objectKey)}`,
      headers: { 'Content-Type': 'application/json' },
    };
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `/api/v1/uploads/objects/${encodeURIComponent(key)}`;
  }

  async deleteObject(key: string): Promise<void> {
    await fs.rm(this.objectPath(key), { force: true });
    await fs.rm(this.metaPath(key), { force: true });
  }

  async writeObject(key: string, contentBase64: string, contentType: string): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.objectPath(key), Buffer.from(contentBase64, 'base64'));
    await fs.writeFile(this.metaPath(key), JSON.stringify({ contentType }));
  }

  async readObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const body = await fs.readFile(this.objectPath(key));
      const meta = JSON.parse(await fs.readFile(this.metaPath(key), 'utf8')) as { contentType: string };
      return { body, contentType: meta.contentType };
    } catch {
      return null;
    }
  }

  private objectPath(key: string): string {
    return path.join(this.baseDir, this.safeName(key));
  }

  private metaPath(key: string): string {
    return path.join(this.baseDir, `${this.safeName(key)}.meta.json`);
  }

  /** Object keys are used as filenames — reject path traversal outright. */
  private safeName(key: string): string {
    if (!key || key.includes('..') || key.includes('/') || key.includes('\\')) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return key;
  }
}
