'use client';

/**
 * Client-side users data source. Backs the Organization Admin UI while the
 * frontend auth wiring (Auth0 SDK + fetch interceptor for the JWT header)
 * is still pending. Every function's signature already matches the shape
 * the real REST endpoints return, so swapping the mock body for a real
 * `fetch('/api/v1/organizations/me/users?…')` call at that layer will not
 * touch the UI components.
 */

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED';
export type RoleKey = 'LEARNER' | 'TRAINER' | 'MANAGER' | 'HR_LD_ADMIN' | 'ORGANIZATION_ADMIN';

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  status: UserStatus;
  externalId: string | null;
  department: { id: string; name: string } | null;
  role: RoleKey | null;
}

export interface PaginatedUsers {
  items: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersParams {
  search?: string;
  status?: UserStatus;
  role?: RoleKey;
  departmentId?: string;
  page?: number;
  pageSize?: number;
}

export interface DepartmentRecord {
  id: string;
  name: string;
}

// A configurable simulated latency + failure scenario for the loading /
// error / empty / permission-denied states the UI must render.
export type MockScenario = 'default' | 'empty' | 'error' | 'forbidden';

const DEPARTMENTS: DepartmentRecord[] = [
  { id: 'dep-eng', name: 'Engineering' },
  { id: 'dep-people', name: 'People Ops' },
  { id: 'dep-sales', name: 'Sales' },
];

const USERS: UserRecord[] = [
  { id: 'u-1', email: 'alex.johnson@demo-org.example', firstName: 'Alex', lastName: 'Johnson', jobTitle: 'Head of People', status: 'ACTIVE', externalId: 'auth0|demo-admin', department: DEPARTMENTS[1], role: 'ORGANIZATION_ADMIN' },
  { id: 'u-2', email: 'priya.nair@demo-org.example', firstName: 'Priya', lastName: 'Nair', jobTitle: 'Engineering Manager', status: 'ACTIVE', externalId: 'auth0|priya', department: DEPARTMENTS[0], role: 'MANAGER' },
  { id: 'u-3', email: 'sam.rivera@demo-org.example', firstName: 'Sam', lastName: 'Rivera', jobTitle: 'Senior Engineer', status: 'ACTIVE', externalId: 'auth0|sam', department: DEPARTMENTS[0], role: 'TRAINER' },
  { id: 'u-4', email: 'jordan.lee@demo-org.example', firstName: 'Jordan', lastName: 'Lee', jobTitle: 'Sales Lead', status: 'ACTIVE', externalId: 'auth0|jordan', department: DEPARTMENTS[2], role: 'LEARNER' },
  { id: 'u-5', email: 'chen.wei@demo-org.example', firstName: 'Chen', lastName: 'Wei', jobTitle: null, status: 'INVITED', externalId: null, department: DEPARTMENTS[0], role: null },
  { id: 'u-6', email: 'omar.hassan@demo-org.example', firstName: 'Omar', lastName: 'Hassan', jobTitle: 'Analyst', status: 'INACTIVE', externalId: 'auth0|omar', department: DEPARTMENTS[2], role: 'LEARNER' },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respect(scenario: MockScenario): Promise<void> {
  await delay(400);
  if (scenario === 'error') throw new Error('Simulated failure');
  if (scenario === 'forbidden') {
    const err = new Error('Missing required permission(s): user:view') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export async function listUsers(params: ListUsersParams, scenario: MockScenario = 'default'): Promise<PaginatedUsers> {
  await respect(scenario);
  if (scenario === 'empty') return { items: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };

  const q = params.search?.toLowerCase();
  const filtered = USERS.filter((u) => {
    if (params.status && u.status !== params.status) return false;
    if (params.role && u.role !== params.role) return false;
    if (params.departmentId && u.department?.id !== params.departmentId) return false;
    if (q && ![u.firstName, u.lastName, u.email].some((f) => f.toLowerCase().includes(q))) return false;
    return true;
  });
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

export async function getUser(id: string, scenario: MockScenario = 'default'): Promise<UserRecord> {
  await respect(scenario);
  const user = USERS.find((u) => u.id === id);
  if (!user) {
    const err = new Error('User not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  return user;
}

export async function listDepartments(scenario: MockScenario = 'default'): Promise<DepartmentRecord[]> {
  await respect(scenario);
  return DEPARTMENTS;
}

export async function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  departmentId?: string;
  role?: RoleKey;
  externalId?: string;
}): Promise<UserRecord> {
  await delay(400);
  const department = input.departmentId ? DEPARTMENTS.find((d) => d.id === input.departmentId) ?? null : null;
  const created: UserRecord = {
    id: `u-${USERS.length + 1}`,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    jobTitle: input.jobTitle ?? null,
    department,
    role: input.role ?? null,
    externalId: input.externalId ?? null,
    status: input.externalId ? 'ACTIVE' : 'INVITED',
  };
  USERS.push(created);
  return created;
}

export async function updateUser(
  id: string,
  input: { firstName?: string; lastName?: string; jobTitle?: string | null; departmentId?: string | null; role?: RoleKey | null },
): Promise<UserRecord> {
  await delay(400);
  const user = USERS.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.jobTitle !== undefined) user.jobTitle = input.jobTitle;
  if (input.departmentId !== undefined) {
    user.department = input.departmentId ? DEPARTMENTS.find((d) => d.id === input.departmentId) ?? null : null;
  }
  if (input.role !== undefined) user.role = input.role;
  return user;
}

export async function setUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<UserRecord> {
  await delay(400);
  const user = USERS.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  user.status = status;
  return user;
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  LEARNER: 'Learner',
  TRAINER: 'Trainer',
  MANAGER: 'Manager',
  HR_LD_ADMIN: 'HR / L&D Admin',
  ORGANIZATION_ADMIN: 'Organization Admin',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  INVITED: 'Invited',
};

export const ROLE_OPTIONS: RoleKey[] = ['LEARNER', 'TRAINER', 'MANAGER', 'HR_LD_ADMIN', 'ORGANIZATION_ADMIN'];
export const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INACTIVE', 'INVITED'];
