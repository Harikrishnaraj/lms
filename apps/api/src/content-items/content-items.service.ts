import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ContentItem, ContentItemStatus, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { STORAGE_PORT, type StoragePort, type UploadTarget } from '../storage/storage.port';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { ReorderContentItemsDto } from './dto/reorder-content-items.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

@Injectable()
export class ContentItemsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async list(organizationId: string, courseId: string, moduleId: string): Promise<ContentItem[]> {
    await this.assertModuleInCourse(organizationId, courseId, moduleId);
    return this.prisma.contentItem.findMany({ where: { organizationId, moduleId }, orderBy: { position: 'asc' } });
  }

  async create(
    organizationId: string,
    courseId: string,
    moduleId: string,
    dto: CreateContentItemDto,
  ): Promise<ContentItem> {
    await this.assertModuleInCourse(organizationId, courseId, moduleId);
    const count = await this.prisma.contentItem.count({ where: { organizationId, moduleId } });
    return this.prisma.contentItem.create({
      data: {
        organizationId,
        moduleId,
        title: dto.title,
        type: dto.type,
        position: count,
        storageKey: dto.storageKey,
        textBody: dto.textBody,
      },
    });
  }

  async update(
    organizationId: string,
    courseId: string,
    moduleId: string,
    contentItemId: string,
    dto: UpdateContentItemDto,
  ): Promise<ContentItem> {
    await this.getOwned(organizationId, courseId, moduleId, contentItemId);
    return this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.storageKey !== undefined ? { storageKey: dto.storageKey } : {}),
        ...(dto.textBody !== undefined ? { textBody: dto.textBody } : {}),
      },
    });
  }

  async setStatus(
    organizationId: string,
    courseId: string,
    moduleId: string,
    contentItemId: string,
    status: ContentItemStatus,
  ): Promise<ContentItem> {
    await this.getOwned(organizationId, courseId, moduleId, contentItemId);
    return this.prisma.contentItem.update({ where: { id: contentItemId }, data: { status } });
  }

  /** Same full-reorder contract as CourseModulesService.reorder — see there for why. */
  async reorder(
    organizationId: string,
    courseId: string,
    moduleId: string,
    dto: ReorderContentItemsDto,
  ): Promise<ContentItem[]> {
    await this.assertModuleInCourse(organizationId, courseId, moduleId);
    const existing = await this.prisma.contentItem.findMany({ where: { organizationId, moduleId }, select: { id: true } });
    const existingIds = new Set(existing.map((c) => c.id));
    const submittedIds = new Set(dto.contentItemIds);

    if (existingIds.size !== submittedIds.size || [...existingIds].some((id) => !submittedIds.has(id))) {
      throw new BadRequestException('contentItemIds must contain exactly the content items belonging to this module');
    }

    await this.prisma.$transaction(
      dto.contentItemIds.map((id, position) => this.prisma.contentItem.update({ where: { id }, data: { position } })),
    );
    return this.prisma.contentItem.findMany({ where: { organizationId, moduleId }, orderBy: { position: 'asc' } });
  }

  async createUploadTarget(organizationId: string, courseId: string, contentType: string): Promise<UploadTarget> {
    await this.assertCourseInOrg(organizationId, courseId);
    // Namespaced by org+course so a leaked key can't be replayed cross-tenant
    // even against a storage backend with no auth of its own (local disk).
    const key = `${organizationId}/${courseId}/${randomUUID()}`;
    return this.storage.createUploadTarget(key, contentType);
  }

  async getDownloadUrl(
    organizationId: string,
    courseId: string,
    moduleId: string,
    contentItemId: string,
  ): Promise<string> {
    const item = await this.getOwned(organizationId, courseId, moduleId, contentItemId);
    if (!item.storageKey) throw new BadRequestException('This content item has no stored file');
    return this.storage.getDownloadUrl(item.storageKey);
  }

  private async assertCourseInOrg(organizationId: string, courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId } });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async assertModuleInCourse(organizationId: string, courseId: string, moduleId: string): Promise<void> {
    await this.assertCourseInOrg(organizationId, courseId);
    const module_ = await this.prisma.module.findFirst({ where: { id: moduleId, organizationId, courseId } });
    if (!module_) throw new NotFoundException('Module not found');
  }

  private async getOwned(
    organizationId: string,
    courseId: string,
    moduleId: string,
    contentItemId: string,
  ): Promise<ContentItem> {
    await this.assertModuleInCourse(organizationId, courseId, moduleId);
    const item = await this.prisma.contentItem.findFirst({
      where: { id: contentItemId, organizationId, moduleId },
    });
    if (!item) throw new NotFoundException('Content item not found');
    return item;
  }
}
