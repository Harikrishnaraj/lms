'use client';

import { apiFetch } from './api-client';

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
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAuditLogsQuery {
  action?: string;
  entityType?: string;
  actorId?: string;
  page?: number;
  pageSize?: number;
}

export function listAuditLogs(query?: ListAuditLogsQuery): Promise<PaginatedAuditLogs> {
  const usp = new URLSearchParams();
  if (query?.action) usp.set('action', query.action);
  if (query?.entityType) usp.set('entityType', query.entityType);
  if (query?.actorId) usp.set('actorId', query.actorId);
  if (query?.page) usp.set('page', query.page.toString());
  if (query?.pageSize) usp.set('pageSize', query.pageSize.toString());
  const q = usp.toString();
  return apiFetch(`/organizations/me/audit-logs${q ? `?${q}` : ''}`);
}
