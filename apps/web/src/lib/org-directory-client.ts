'use client';

/**
 * A minimal REAL client against GET /organizations/me/users and
 * GET /organizations/me/departments, used only to populate "pick a
 * recipient" pickers (Assignments). Deliberately separate from
 * users-client.ts / departments-client.ts, which are still in-memory
 * mocks pending frontend auth wiring -- see those files' headers. Both
 * real endpoints are gated on `user:view`, which every actor who can
 * reach the Assignments create form (Manager, HR/L&D Admin, Organization
 * Admin) already holds.
 */

import { apiFetch } from './api-client';

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export function listUsersForPicker(): Promise<UserOption[]> {
  return apiFetch<{ items: UserOption[] }>('/organizations/me/users?pageSize=100').then((res) => res.items);
}

export function listDepartmentsForPicker(): Promise<DepartmentOption[]> {
  return apiFetch<DepartmentOption[]>('/organizations/me/departments');
}
