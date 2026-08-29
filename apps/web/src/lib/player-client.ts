'use client';

/**
 * Real fetch calls against the course player (Task 15). See api-client.ts
 * for the auth/error-handling contract every call here shares.
 */

import { apiFetch } from './api-client';

export type PlayerContentType = 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'RESOURCE' | 'QUIZ';
export type PlayerContentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface PlayerContentItem {
  id: string;
  title: string;
  type: PlayerContentType;
  position: number;
  textBody: string | null;
  playbackUrl: string | null;
  status: PlayerContentStatus;
  completedAt: string | null;
  assessmentId: string | null;
}

export interface PlayerModuleView {
  id: string;
  title: string;
  position: number;
  contentItems: PlayerContentItem[];
}

export interface PlayerView {
  enrollment: {
    id: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    isMandatory: boolean;
    dueDate: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  course: { id: string; title: string };
  modules: PlayerModuleView[];
  resumeContentItemId: string | null;
}

export function getPlayer(enrollmentId: string): Promise<PlayerView> {
  return apiFetch(`/organizations/me/enrollments/${enrollmentId}/player`);
}

export function markContentProgress(
  enrollmentId: string,
  contentItemId: string,
  status: 'IN_PROGRESS' | 'COMPLETED',
): Promise<PlayerView> {
  return apiFetch(`/organizations/me/enrollments/${enrollmentId}/content/${contentItemId}/progress`, {
    method: 'POST',
    body: { status },
  });
}

export function countCompleted(view: PlayerView): { completed: number; total: number } {
  const items = view.modules.flatMap((m) => m.contentItems);
  return { completed: items.filter((ci) => ci.status === 'COMPLETED').length, total: items.length };
}
