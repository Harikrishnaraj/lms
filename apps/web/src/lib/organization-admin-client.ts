'use client';

/**
 * Organization administration client — wraps endpoints for org profile,
 * membership/role management, and admin-level overview stats.
 */

import { apiFetch } from './api-client';

export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export type RoleKey = 'LEARNER' | 'TRAINER' | 'MANAGER' | 'HR_LD_ADMIN' | 'ORGANIZATION_ADMIN';

export interface MembershipRecord {
  organizationId: string;
  userId: string;
  role?: { key: RoleKey; name: string };
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export function getOrganization(): Promise<OrganizationProfile> {
  return apiFetch('/organizations/me');
}

export function updateOrganization(data: { name?: string }): Promise<OrganizationProfile> {
  return apiFetch('/organizations/me', { method: 'PATCH', body: data });
}

export function listMembers(): Promise<MembershipRecord[]> {
  return apiFetch('/organizations/me/members');
}

export function assignRole(userId: string, role: RoleKey): Promise<MembershipRecord> {
  return apiFetch('/organizations/me/members', { method: 'POST', body: { userId, role } });
}

export function revokeMembership(userId: string): Promise<void> {
  return apiFetch(`/organizations/me/members/${userId}`, { method: 'DELETE' });
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  LEARNER: 'Learner',
  TRAINER: 'Trainer',
  MANAGER: 'Manager',
  HR_LD_ADMIN: 'HR / L&D Admin',
  ORGANIZATION_ADMIN: 'Organization Admin',
};
