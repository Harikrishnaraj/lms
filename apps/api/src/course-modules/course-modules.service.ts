import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Module, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { CreateModuleDto } from './dto/create-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class CourseModulesService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(organizationId: string, courseId: string): Promise<Module[]> {
    await this.assertCourseInOrg(organizationId, courseId);
    return this.prisma.module.findMany({ where: { organizationId, courseId }, orderBy: { position: 'asc' } });
  }

  async create(organizationId: string, courseId: string, dto: CreateModuleDto): Promise<Module> {
    await this.assertCourseInOrg(organizationId, courseId);
    const count = await this.prisma.module.count({ where: { organizationId, courseId } });
    return this.prisma.module.create({
      data: { organizationId, courseId, title: dto.title, position: count },
    });
  }

  async update(organizationId: string, courseId: string, moduleId: string, dto: UpdateModuleDto): Promise<Module> {
    await this.getOwned(organizationId, courseId, moduleId);
    return this.prisma.module.update({ where: { id: moduleId }, data: { title: dto.title } });
  }

  /**
   * Full reorder: the caller submits every module id for the course, in the
   * desired order. Rejecting anything short of the full set (missing,
   * extra, or foreign ids) keeps `position` dense and unambiguous — no
   * partial reorders that could leave gaps or duplicate positions.
   */
  async reorder(organizationId: string, courseId: string, dto: ReorderModulesDto): Promise<Module[]> {
    await this.assertCourseInOrg(organizationId, courseId);
    const existing = await this.prisma.module.findMany({ where: { organizationId, courseId }, select: { id: true } });
    const existingIds = new Set(existing.map((m) => m.id));
    const submittedIds = new Set(dto.moduleIds);

    if (existingIds.size !== submittedIds.size || [...existingIds].some((id) => !submittedIds.has(id))) {
      throw new BadRequestException('moduleIds must contain exactly the modules belonging to this course');
    }

    await this.prisma.$transaction(
      dto.moduleIds.map((id, position) => this.prisma.module.update({ where: { id }, data: { position } })),
    );
    return this.prisma.module.findMany({ where: { organizationId, courseId }, orderBy: { position: 'asc' } });
  }

  /** courseId is the primary resource in the path (like a getById), so a cross-tenant id 404s — same rule as Courses/Users/Departments getById. */
  private async assertCourseInOrg(organizationId: string, courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId } });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async getOwned(organizationId: string, courseId: string, moduleId: string): Promise<Module> {
    await this.assertCourseInOrg(organizationId, courseId);
    const module_ = await this.prisma.module.findFirst({ where: { id: moduleId, organizationId, courseId } });
    if (!module_) throw new NotFoundException('Module not found');
    return module_;
  }
}
