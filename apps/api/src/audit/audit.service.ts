import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto';

export interface AuditLogRecordParams {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  actorId: string | null;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async record(params: AuditLogRecordParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actorId: params.actorId ?? undefined,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? undefined,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
          ipAddress: params.ipAddress ?? undefined,
          userAgent: params.userAgent ?? undefined,
        },
      });
    } catch {
      // Audit recording should not throw in critical user paths
    }
  }

  async list(organizationId: string, query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: { contains: query.entityType, mode: 'insensitive' } } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        actorId: item.actorId,
        actor: item.actor,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }
}
