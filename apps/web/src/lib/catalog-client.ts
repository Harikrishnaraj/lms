'use client';

/**
 * Real fetch calls against GET/organizations/me/catalog (Task 13). See
 * api-client.ts for the auth/error-handling contract every call here
 * shares.
 */

import { apiFetch } from './api-client';

export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CatalogEnrollmentStatus = 'NOT_ENROLLED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CatalogInstructorRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
}

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  difficulty: CourseDifficulty | null;
  durationMinutes: number | null;
  learningObjectives: string[];
  instructor: CatalogInstructorRef | null;
  categories: CatalogCategory[];
  enrollmentId: string | null;
  enrollmentStatus: CatalogEnrollmentStatus;
  isMandatory: boolean;
  dueDate: string | null;
}

export interface PaginatedCatalogCourses {
  items: CatalogCourse[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListCatalogParams {
  search?: string;
  category?: string;
  difficulty?: CourseDifficulty;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function listCatalog(params: ListCatalogParams = {}): Promise<PaginatedCatalogCourses> {
  return apiFetch(`/organizations/me/catalog${toQueryString(params)}`);
}

export function listCatalogCategories(): Promise<CatalogCategory[]> {
  return apiFetch('/organizations/me/catalog/categories');
}

export function getCatalogCourse(id: string): Promise<CatalogCourse> {
  return apiFetch(`/organizations/me/catalog/${id}`);
}

export const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const DIFFICULTY_OPTIONS: CourseDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export const ENROLLMENT_STATUS_LABEL: Record<CatalogEnrollmentStatus, string> = {
  NOT_ENROLLED: 'Not enrolled',
  NOT_STARTED: 'Enrolled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
