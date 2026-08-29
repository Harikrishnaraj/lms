'use client';

/**
 * Real fetch calls against /organizations/me/enrollments (Task 14). See
 * api-client.ts for the auth/error-handling contract every call here
 * shares.
 */

import { apiFetch } from './api-client';
import type { CourseDifficulty } from './catalog-client';

export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type EnrollmentSource = 'SELF' | 'ADMIN' | 'MANAGER';

export interface EnrollmentCourseRef {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE';
  durationMinutes: number | null;
  difficulty: CourseDifficulty | null;
}

export interface EnrollmentRecord {
  id: string;
  status: EnrollmentStatus;
  isMandatory: boolean;
  source: EnrollmentSource;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  course: EnrollmentCourseRef;
}

export interface PaginatedEnrollments {
  items: EnrollmentRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export function listMyEnrollments(params: { status?: EnrollmentStatus } = {}): Promise<PaginatedEnrollments> {
  const usp = new URLSearchParams();
  if (params.status) usp.set('status', params.status);
  const q = usp.toString();
  return apiFetch(`/organizations/me/enrollments/mine${q ? `?${q}` : ''}`);
}

export function selfEnroll(courseId: string): Promise<EnrollmentRecord> {
  return apiFetch('/organizations/me/enrollments/self', { method: 'POST', body: { courseId } });
}

export function cancelEnrollment(id: string): Promise<void> {
  return apiFetch(`/organizations/me/enrollments/${id}`, { method: 'DELETE' });
}

export const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
