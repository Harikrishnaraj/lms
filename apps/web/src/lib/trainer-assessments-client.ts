'use client';

/**
 * Trainer-side assessment management client — wraps the author-facing
 * /organizations/me/assessments endpoints. Complements the learner-side
 * assessments-client.ts which only hits /my-assessments.
 */

import { apiFetch } from './api-client';

export interface AssessmentListItem {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  attemptLimit: number | null;
  createdAt: string;
  _count: { questions: number; attempts: number };
  contentItem?: { module: { course: { id: string; title: string } } } | null;
}

export interface PaginatedAssessments {
  items: AssessmentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthorQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
  createdAt: string;
}

export interface AssessmentForAuthor {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  attemptLimit: number | null;
  contentItemId: string | null;
  questions: AuthorQuestion[];
  courseRef: { id: string; title: string } | null;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  score: number;
  passed: boolean;
  answers: unknown;
  submittedAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export function listAssessments(params: {
  search?: string;
  courseId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedAssessments> {
  const usp = new URLSearchParams();
  if (params.search) usp.set('search', params.search);
  if (params.courseId) usp.set('courseId', params.courseId);
  if (params.page) usp.set('page', String(params.page));
  if (params.pageSize) usp.set('pageSize', String(params.pageSize));
  const q = usp.toString();
  return apiFetch(`/organizations/me/assessments${q ? `?${q}` : ''}`);
}

export function getAssessmentForAuthor(id: string): Promise<AssessmentForAuthor> {
  return apiFetch(`/organizations/me/assessments/${id}`);
}

export function createAssessment(data: {
  title: string;
  description?: string;
  passingScore?: number;
  attemptLimit?: number | null;
  contentItemId?: string;
}): Promise<AssessmentForAuthor> {
  return apiFetch('/organizations/me/assessments', { method: 'POST', body: data });
}

export function updateAssessment(
  id: string,
  data: { title?: string; description?: string; passingScore?: number; attemptLimit?: number | null },
): Promise<AssessmentForAuthor> {
  return apiFetch(`/organizations/me/assessments/${id}`, { method: 'PATCH', body: data });
}

export function deleteAssessment(id: string): Promise<void> {
  return apiFetch(`/organizations/me/assessments/${id}`, { method: 'DELETE' });
}

export function addQuestion(
  assessmentId: string,
  data: { text: string; options: string[]; correctIndex: number; points?: number },
): Promise<AuthorQuestion> {
  return apiFetch(`/organizations/me/assessments/${assessmentId}/questions`, {
    method: 'POST',
    body: data,
  });
}

export function updateQuestion(
  assessmentId: string,
  questionId: string,
  data: { text: string; options: string[]; correctIndex: number; points?: number },
): Promise<AuthorQuestion> {
  return apiFetch(`/organizations/me/assessments/${assessmentId}/questions/${questionId}`, {
    method: 'PATCH',
    body: data,
  });
}

export function deleteQuestion(assessmentId: string, questionId: string): Promise<void> {
  return apiFetch(`/organizations/me/assessments/${assessmentId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

export function listAttempts(assessmentId: string): Promise<AttemptRecord[]> {
  return apiFetch(`/organizations/me/assessments/${assessmentId}/attempts`);
}
