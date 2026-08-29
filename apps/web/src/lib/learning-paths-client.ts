'use client';

/**
 * Real fetch calls against the Learning Paths API (Task 16). See
 * api-client.ts for the auth/error-handling contract every call here
 * shares. Split into an admin surface (`/learning-paths`, requires
 * `learning-path:manage`) and a learner surface (`/learning-path-catalog`,
 * PUBLISHED paths only) -- mirrors the courses/catalog split.
 */

import { apiFetch } from './api-client';
import type { CourseDifficulty } from './catalog-client';

export type LearningPathStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LearningPathProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type LearningPathCourseEnrollmentStatus = 'NOT_ENROLLED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LearningPathCourseRef {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE';
  durationMinutes: number | null;
  difficulty: CourseDifficulty | null;
}

export interface LearningPathCourseMembership {
  courseId: string;
  position: number;
  isRequired: boolean;
  course: LearningPathCourseRef;
}

export interface LearningPathCreatorRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  status: LearningPathStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: LearningPathCreatorRef | null;
  courses: LearningPathCourseMembership[];
}

export interface LearningPathCourseProgress {
  courseId: string;
  title: string;
  position: number;
  isRequired: boolean;
  enrollmentId: string | null;
  enrollmentStatus: LearningPathCourseEnrollmentStatus;
}

export interface LearningPathProgress {
  status: LearningPathProgressStatus;
  isEnrolled: boolean;
  isMandatory: boolean;
  dueDate: string | null;
  courses: LearningPathCourseProgress[];
}

export type LearningPathWithProgress = LearningPath & { progress: LearningPathProgress };

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// ---- Learner surface ----

export function listLearningPathCatalog(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<LearningPathWithProgress>> {
  return apiFetch(`/organizations/me/learning-path-catalog${toQueryString(params)}`);
}

export function getLearningPathCatalogEntry(id: string): Promise<LearningPathWithProgress> {
  return apiFetch(`/organizations/me/learning-path-catalog/${id}`);
}

export function listMyLearningPaths(): Promise<LearningPathWithProgress[]> {
  return apiFetch('/organizations/me/learning-path-catalog/mine');
}

export function enrollInLearningPath(id: string): Promise<LearningPathProgress> {
  return apiFetch(`/organizations/me/learning-path-catalog/${id}/enroll`, { method: 'POST' });
}

// ---- Admin surface (learning-path:manage) ----

export function listLearningPathsAdmin(params: { search?: string; status?: LearningPathStatus; page?: number; pageSize?: number } = {}): Promise<Paginated<LearningPath>> {
  return apiFetch(`/organizations/me/learning-paths${toQueryString(params)}`);
}

export function getLearningPathAdmin(id: string): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}`);
}

export function createLearningPath(input: { title: string; description?: string }): Promise<LearningPath> {
  return apiFetch('/organizations/me/learning-paths', { method: 'POST', body: input });
}

export function updateLearningPath(id: string, input: { title?: string; description?: string }): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}`, { method: 'PATCH', body: input });
}

export function setLearningPathStatus(id: string, status: LearningPathStatus): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}/status`, { method: 'PATCH', body: { status } });
}

export function addLearningPathCourse(id: string, input: { courseId: string; isRequired?: boolean }): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}/courses`, { method: 'POST', body: input });
}

export function removeLearningPathCourse(id: string, courseId: string): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}/courses/${courseId}`, { method: 'DELETE' });
}

export function reorderLearningPathCourses(id: string, courseIds: string[]): Promise<LearningPath> {
  return apiFetch(`/organizations/me/learning-paths/${id}/courses/reorder`, { method: 'PATCH', body: { courseIds } });
}

export const LEARNING_PATH_STATUS_LABEL: Record<LearningPathStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const LEARNING_PATH_PROGRESS_LABEL: Record<LearningPathProgressStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
