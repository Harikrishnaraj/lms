'use client';

/**
 * A minimal REAL client against GET /organizations/me/courses, used only
 * to populate "pick a course" dropdowns (Learning Paths course picker,
 * Assignments course picker). Deliberately separate from courses-client.ts,
 * which is still an in-memory mock pending the Trainer/Admin course-portal
 * completion task (21/24) -- see that file's header. Mixing mock course
 * ids into a real backend call (add-course-to-path, assign-course) would
 * silently fail, so this file exists to keep the picker real without
 * waiting on that larger migration.
 */

import { apiFetch } from './api-client';

export interface CourseOption {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export function listAllCoursesForPicker(): Promise<CourseOption[]> {
  return apiFetch<{ items: CourseOption[] }>('/organizations/me/courses?pageSize=100').then((res) => res.items);
}
