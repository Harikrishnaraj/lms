import { Body, Controller, Get, NotFoundException, Param, Put, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsBase64, IsString, MinLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { LocalDiskStorageProvider } from './providers/local-disk-storage.provider';

class PutObjectDto {
  @IsBase64()
  contentBase64!: string;

  @IsString()
  @MinLength(1)
  contentType!: string;
}

/**
 * Backs LocalDiskStorageProvider's upload/download targets. Only meaningful
 * when STORAGE_PROVIDER=local (dev); with STORAGE_PROVIDER=s3 the client
 * talks to the real presigned URL directly and never hits this API.
 *
 * @Public() here is deliberate but narrow: these routes read/write by opaque
 * key, not by any tenant-scoped id, so there is no organization to check
 * against. Real deployments use S3, where the presigned URL itself is the
 * auth. TODO before shipping local-disk to anything but a laptop: require
 * the caller's JWT and check the key belongs to a ContentItem in their org.
 */
@ApiTags('Uploads (local dev storage)')
@Controller('uploads/objects')
export class UploadsController {
  constructor(private readonly localDisk: LocalDiskStorageProvider) {}

  @Public()
  @Put(':key')
  @ApiOperation({ summary: 'Write an object to local disk storage' })
  async put(@Param('key') key: string, @Body() dto: PutObjectDto): Promise<{ key: string }> {
    await this.localDisk.writeObject(key, dto.contentBase64, dto.contentType);
    return { key };
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Read an object from local disk storage' })
  async get(@Param('key') key: string, @Res() res: Response): Promise<void> {
    const object = await this.localDisk.readObject(key);
    if (!object) throw new NotFoundException('Object not found');
    res.setHeader('Content-Type', object.contentType);
    res.send(object.body);
  }
}
