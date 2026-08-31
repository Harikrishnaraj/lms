import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { AuditService } from '../audit/audit.service';
import { AI_PORT, type AiPort, type CourseOutlineGeneration } from './ai.port';
import { GenerateOutlineDto, TagContentDto } from './dto/ai-request.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(AI_PORT) private readonly aiProvider: AiPort,
    private readonly auditService: AuditService,
  ) {}

  async generateCourseOutline(
    organizationId: string,
    userId: string,
    dto: GenerateOutlineDto,
  ): Promise<CourseOutlineGeneration> {
    this.logger.log(`Generating AI course outline for org ${organizationId} on topic: "${dto.topic}"`);

    const result = await this.aiProvider.generateCourseOutline(dto.topic, dto.targetAudience);

    // Audit logging for AI usage
    await this.auditService.record({
      organizationId,
      actorId: userId,
      action: 'ai:generate_outline',
      entityType: 'Course',
      metadata: { topic: dto.topic, modulesGenerated: result.modules.length },
    });

    return result;
  }

  async getRecommendations(organizationId: string, userId: string): Promise<string[]> {
    // Retrieve user profile and completed courses strictly within tenant
    const user = await this.prisma.user.findFirst({
      where: { organizationId, id: userId },
      include: {
        department: { select: { name: true } },
        enrollments: {
          where: { status: 'COMPLETED' },
          include: { course: { select: { title: true } } },
        },
      },
    });

    const completedTitles = user?.enrollments.map((e) => e.course.title) ?? [];

    // Fetch published catalog courses within organization
    const availableCourses = await this.prisma.course.findMany({
      where: { organizationId, status: 'PUBLISHED' },
      select: { id: true, title: true, description: true },
      take: 50,
    });

    const recommendedIds = await this.aiProvider.generateRecommendations(
      {
        jobTitle: user?.jobTitle,
        departmentName: user?.department?.name,
        completedCourseTitles: completedTitles,
      },
      availableCourses,
    );

    await this.auditService.record({
      organizationId,
      actorId: userId,
      action: 'ai:recommendations',
      entityType: 'User',
      entityId: userId,
      metadata: { recommendedCount: recommendedIds.length },
    });

    return recommendedIds;
  }

  async tagContent(
    organizationId: string,
    userId: string,
    dto: TagContentDto,
  ): Promise<string[]> {
    const tags = await this.aiProvider.tagContent(dto.content);

    await this.auditService.record({
      organizationId,
      actorId: userId,
      action: 'ai:tag_content',
      entityType: 'ContentItem',
      metadata: { tagCount: tags.length },
    });

    return tags;
  }
}
