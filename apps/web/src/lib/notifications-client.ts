'use client';

/**
 * Client-side notifications data source — wraps the real NestJS
 * /organizations/me/notifications endpoints (Task 25). Used by the
 * notifications bell in the app shell and the notification preferences page.
 */

import { apiFetch } from './api-client';

export type NotificationType =
  | 'COURSE_ASSIGNED'
  | 'ASSESSMENT_RESULT'
  | 'COURSE_COMPLETED'
  | 'CERTIFICATE_ISSUED'
  | 'ANNOUNCEMENT';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: NotificationRecord[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}

export interface NotificationPreference {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

export function listMyNotifications(params: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
} = {}): Promise<PaginatedNotifications> {
  const usp = new URLSearchParams();
  if (params.page) usp.set('page', String(params.page));
  if (params.pageSize) usp.set('pageSize', String(params.pageSize));
  if (params.unreadOnly) usp.set('unreadOnly', 'true');
  const q = usp.toString();
  return apiFetch(`/organizations/me/notifications${q ? `?${q}` : ''}`);
}

export function markRead(id: string): Promise<NotificationRecord> {
  return apiFetch(`/organizations/me/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllRead(): Promise<{ updated: number }> {
  return apiFetch('/organizations/me/notifications/read-all', { method: 'PATCH' });
}

export function getPreferences(): Promise<NotificationPreference[]> {
  return apiFetch('/organizations/me/notifications/preferences');
}

export function updatePreferences(
  preferences: NotificationPreference[],
): Promise<NotificationPreference[]> {
  return apiFetch('/organizations/me/notifications/preferences', {
    method: 'PUT',
    body: { preferences },
  });
}

export function broadcastAnnouncement(input: {
  title: string;
  body: string;
  departmentId?: string;
}): Promise<{ recipientCount: number }> {
  return apiFetch('/organizations/me/notifications/announcements', {
    method: 'POST',
    body: input,
  });
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  COURSE_ASSIGNED: 'Course Assigned',
  ASSESSMENT_RESULT: 'Assessment Result',
  COURSE_COMPLETED: 'Course Completed',
  CERTIFICATE_ISSUED: 'Certificate Issued',
  ANNOUNCEMENT: 'Announcement',
};
