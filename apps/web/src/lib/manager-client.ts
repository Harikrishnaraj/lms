'use client';

/**
 * Manager workspace data client — wraps endpoints for department members,
 * team enrollments, and manager-scoped assignments.
 */

import { apiFetch } from './api-client';
import { EnrollmentRecord, PaginatedEnrollments } from './enrollments-client';
import { PaginatedUsers } from './users-client';

export function listTeamEnrollments(params: {
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedEnrollments> {
  const usp = new URLSearchParams();
  if (params.departmentId) usp.set('departmentId', params.departmentId);
  if (params.status) usp.set('status', params.status);
  if (params.page) usp.set('page', String(params.page));
  if (params.pageSize) usp.set('pageSize', String(params.pageSize));
  const q = usp.toString();
  return apiFetch(`/organizations/me/enrollments${q ? `?${q}` : ''}`);
}

export function listTeamMembers(params: {
  departmentId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<PaginatedUsers> {
  const usp = new URLSearchParams();
  if (params.departmentId) usp.set('departmentId', params.departmentId);
  if (params.page) usp.set('page', String(params.page));
  if (params.pageSize) usp.set('pageSize', String(params.pageSize));
  if (params.search) usp.set('search', params.search);
  const q = usp.toString();
  return apiFetch(`/organizations/me/users${q ? `?${q}` : ''}`);
}

export function assignTeamTraining(data: {
  courseId: string;
  userId: string;
  isMandatory?: boolean;
  dueDate?: string | null;
}): Promise<EnrollmentRecord> {
  return apiFetch('/organizations/me/enrollments', {
    method: 'POST',
    body: data,
  });
}
