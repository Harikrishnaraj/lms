'use client';

/**
 * Client-side departments data source — mirrors users-client.ts. Swap for a
 * real fetch('/api/v1/organizations/me/departments') call once frontend
 * auth wiring lands; the shapes already match the REST API's response.
 */

export type DepartmentStatus = 'ACTIVE' | 'ARCHIVED';

export interface ManagerRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  status: DepartmentStatus;
  manager: ManagerRef | null;
  userCount: number;
}

const MANAGERS: ManagerRef[] = [
  { id: 'u-1', firstName: 'Alex', lastName: 'Johnson', email: 'alex.johnson@demo-org.example' },
  { id: 'u-2', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@demo-org.example' },
];

const DEPARTMENTS: DepartmentRecord[] = [
  { id: 'dep-eng', name: 'Engineering', status: 'ACTIVE', manager: MANAGERS[1], userCount: 2 },
  { id: 'dep-people', name: 'People Ops', status: 'ACTIVE', manager: MANAGERS[0], userCount: 1 },
  { id: 'dep-sales', name: 'Sales', status: 'ACTIVE', manager: null, userCount: 2 },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listManagers(): Promise<ManagerRef[]> {
  await delay(200);
  return MANAGERS;
}

export async function listDepartments(includeArchived = false): Promise<DepartmentRecord[]> {
  await delay(400);
  return DEPARTMENTS.filter((d) => includeArchived || d.status === 'ACTIVE');
}

export async function getDepartment(id: string): Promise<DepartmentRecord> {
  await delay(400);
  const department = DEPARTMENTS.find((d) => d.id === id);
  if (!department) {
    const err = new Error('Department not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  return department;
}

export async function createDepartment(input: { name: string; managerId?: string }): Promise<DepartmentRecord> {
  await delay(400);
  const manager = input.managerId ? (MANAGERS.find((m) => m.id === input.managerId) ?? null) : null;
  const created: DepartmentRecord = {
    id: `dep-${DEPARTMENTS.length + 1}`,
    name: input.name,
    status: 'ACTIVE',
    manager,
    userCount: 0,
  };
  DEPARTMENTS.push(created);
  return created;
}

export async function updateDepartment(
  id: string,
  input: { name?: string; managerId?: string | null },
): Promise<DepartmentRecord> {
  await delay(400);
  const department = DEPARTMENTS.find((d) => d.id === id);
  if (!department) throw new Error('Department not found');
  if (input.name !== undefined) department.name = input.name;
  if (input.managerId !== undefined) {
    department.manager = input.managerId ? (MANAGERS.find((m) => m.id === input.managerId) ?? null) : null;
  }
  return department;
}

export async function setDepartmentStatus(id: string, status: DepartmentStatus): Promise<DepartmentRecord> {
  await delay(400);
  const department = DEPARTMENTS.find((d) => d.id === id);
  if (!department) throw new Error('Department not found');
  department.status = status;
  return department;
}

export const STATUS_LABEL: Record<DepartmentStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};
