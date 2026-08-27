import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ContentItem } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { ContentItemsService } from './content-items.service';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { CreateUploadTargetDto } from './dto/create-upload-target.dto';
import { ReorderContentItemsDto } from './dto/reorder-content-items.dto';
import { SetContentItemStatusDto } from './dto/set-content-item-status.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';
import type { UploadTarget } from '../storage/storage.port';

@ApiTags('Content Items')
@Controller('organizations/me/courses/:courseId')
export class ContentItemsController {
  constructor(private readonly contentItemsService: ContentItemsService) {}

  @Post('uploads')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Get an upload target for a new course asset' })
  createUploadTarget(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateUploadTargetDto,
  ): Promise<UploadTarget> {
    return this.contentItemsService.createUploadTarget(organizationId, courseId, dto.contentType);
  }

  @Get('modules/:moduleId/content')
  @Permissions('course:read')
  @ApiOperation({ summary: "List a module's content items, in order" })
  list(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ): Promise<ContentItem[]> {
    return this.contentItemsService.list(organizationId, courseId, moduleId);
  }

  @Post('modules/:moduleId/content')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Create a content item, appended to the end of the module' })
  create(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateContentItemDto,
  ): Promise<ContentItem> {
    return this.contentItemsService.create(organizationId, courseId, moduleId, dto);
  }

  @Put('modules/:moduleId/content/:contentItemId')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Edit a content item' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('contentItemId', ParseUUIDPipe) contentItemId: string,
    @Body() dto: UpdateContentItemDto,
  ): Promise<ContentItem> {
    return this.contentItemsService.update(organizationId, courseId, moduleId, contentItemId, dto);
  }

  @Patch('modules/:moduleId/content/:contentItemId/status')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Archive or restore a content item' })
  setStatus(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('contentItemId', ParseUUIDPipe) contentItemId: string,
    @Body() dto: SetContentItemStatusDto,
  ): Promise<ContentItem> {
    return this.contentItemsService.setStatus(organizationId, courseId, moduleId, contentItemId, dto.status);
  }

  @Get('modules/:moduleId/content/:contentItemId/download-url')
  @Permissions('course:read')
  @ApiOperation({ summary: "Resolve a content item's file to a temporary download URL" })
  getDownloadUrl(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('contentItemId', ParseUUIDPipe) contentItemId: string,
  ): Promise<{ url: string }> {
    return this.contentItemsService
      .getDownloadUrl(organizationId, courseId, moduleId, contentItemId)
      .then((url) => ({ url }));
  }

  @Patch('modules/:moduleId/content/reorder')
  @Permissions('course:update')
  @ApiOperation({ summary: 'Reorder every content item in the module' })
  reorder(
    @CurrentTenant() organizationId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: ReorderContentItemsDto,
  ): Promise<ContentItem[]> {
    return this.contentItemsService.reorder(organizationId, courseId, moduleId, dto);
  }
}
