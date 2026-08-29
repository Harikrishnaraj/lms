'use client';

/**
 * Real fetch calls against /organizations/me/assignments (Task 17). See
 * api-client.ts for the auth/error-handling contract every call here
 * shares.
 */

import { apiFetch } from './api-client';

export type AssignmentTargetType = 'COURSE' | 'LEARNING_PATH';
export type AssignmentScopeType = 'USER' | 'DEPARTMENT';

export interface AssignmentRef {
  id: string;
  title: string;
}

export interface AssignmentUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Assignment {
  id: string;
  targetType: AssignmentTargetType;
  course: AssignmentRef | null;
  learningPath: AssignmentRef | null;
  scopeType: AssignmentScopeType;
  targetUser: AssignmentUserRef | null;
  department: { id: string; name: string } | null;
  isMandatory: boolean;
  dueDate: string | null;
  recipientCount: number;
  recipients: AssignmentUserRef[];
  createdBy: AssignmentUserRef;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateAssignmentInput {
  targetType: AssignmentTargetType;
  courseId?: string;
  learningPathId?: string;
  scopeType: AssignmentScopeType;
  userId?: string;
  departmentId?: string;
  isMandatory?: boolean;
  dueDate?: string;
}

export function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  return apiFetch('/organizations/me/assignments', { method: 'POST', body: input });
}

export function listAssignments(params: { page?: number; pageSize?: number } = {}): Promise<Paginated<Assignment>> {
  const usp = new URLSearchParams();
  if (params.page) usp.set('page', String(params.page));
  if (params.pageSize) usp.set('pageSize', String(params.pageSize));
  const q = usp.toString();
  return apiFetch(`/organizations/me/assignments${q ? `?${q}` : ''}`);
}

export function getAssignment(id: string): Promise<Assignment> {
  return apiFetch(`/organizations/me/assignments/${id}`);
}
