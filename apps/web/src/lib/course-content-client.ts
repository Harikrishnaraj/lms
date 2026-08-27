'use client';

/**
 * Client-side course structure (modules + content items) data source —
 * mirrors courses-client.ts. Swap for real
 * fetch('/api/v1/organizations/me/courses/:id/modules', ...) calls once
 * frontend auth wiring lands; shapes already match the REST API.
 */

export type ContentType = 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'RESOURCE';
export type ContentItemStatus = 'ACTIVE' | 'ARCHIVED';

export interface ModuleRecord {
  id: string;
  courseId: string;
  title: string;
  position: number;
}

export interface ContentItemRecord {
  id: string;
  moduleId: string;
  title: string;
  type: ContentType;
  status: ContentItemStatus;
  position: number;
  storageKey: string | null;
  textBody: string | null;
}

const MODULES: ModuleRecord[] = [
  { id: 'mod-1', courseId: 'course-1', title: 'Getting Started', position: 0 },
  { id: 'mod-2', courseId: 'course-1', title: 'Giving Feedback', position: 1 },
];

const CONTENT_ITEMS: ContentItemRecord[] = [
  { id: 'ci-1', moduleId: 'mod-1', title: 'Welcome', type: 'TEXT', status: 'ACTIVE', position: 0, storageKey: null, textBody: 'Welcome to the course!' },
  { id: 'ci-2', moduleId: 'mod-1', title: 'Course overview video', type: 'VIDEO', status: 'ACTIVE', position: 1, storageKey: 'demo/overview.mp4', textBody: null },
  { id: 'ci-3', moduleId: 'mod-2', title: 'Feedback framework', type: 'DOCUMENT', status: 'ACTIVE', position: 0, storageKey: 'demo/framework.pdf', textBody: null },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  VIDEO: 'Video',
  DOCUMENT: 'Document',
  TEXT: 'Text',
  RESOURCE: 'Resource',
};
export const CONTENT_TYPE_OPTIONS: ContentType[] = ['TEXT', 'VIDEO', 'DOCUMENT', 'RESOURCE'];
export const STORAGE_BACKED_TYPES: ContentType[] = ['VIDEO', 'DOCUMENT', 'RESOURCE'];

export async function listModules(courseId: string): Promise<ModuleRecord[]> {
  await delay(300);
  return MODULES.filter((m) => m.courseId === courseId).sort((a, b) => a.position - b.position);
}

export async function createModule(courseId: string, title: string): Promise<ModuleRecord> {
  await delay(300);
  const position = MODULES.filter((m) => m.courseId === courseId).length;
  const created: ModuleRecord = { id: `mod-${MODULES.length + 1}`, courseId, title, position };
  MODULES.push(created);
  return created;
}

export async function updateModule(id: string, title: string): Promise<ModuleRecord> {
  await delay(300);
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error('Module not found');
  m.title = title;
  return m;
}

export async function reorderModules(courseId: string, moduleIds: string[]): Promise<ModuleRecord[]> {
  await delay(300);
  moduleIds.forEach((id, position) => {
    const m = MODULES.find((x) => x.id === id);
    if (m) m.position = position;
  });
  return listModules(courseId);
}

export async function listContentItems(moduleId: string): Promise<ContentItemRecord[]> {
  await delay(300);
  return CONTENT_ITEMS.filter((c) => c.moduleId === moduleId).sort((a, b) => a.position - b.position);
}

export async function createContentItem(
  moduleId: string,
  input: { title: string; type: ContentType; storageKey?: string; textBody?: string },
): Promise<ContentItemRecord> {
  await delay(300);
  const position = CONTENT_ITEMS.filter((c) => c.moduleId === moduleId).length;
  const created: ContentItemRecord = {
    id: `ci-${CONTENT_ITEMS.length + 1}`,
    moduleId,
    title: input.title,
    type: input.type,
    status: 'ACTIVE',
    position,
    storageKey: input.storageKey ?? null,
    textBody: input.textBody ?? null,
  };
  CONTENT_ITEMS.push(created);
  return created;
}

export async function setContentItemStatus(id: string, status: ContentItemStatus): Promise<ContentItemRecord> {
  await delay(300);
  const c = CONTENT_ITEMS.find((x) => x.id === id);
  if (!c) throw new Error('Content item not found');
  c.status = status;
  return c;
}

export async function reorderContentItems(moduleId: string, contentItemIds: string[]): Promise<ContentItemRecord[]> {
  await delay(300);
  contentItemIds.forEach((id, position) => {
    const c = CONTENT_ITEMS.find((x) => x.id === id);
    if (c) c.position = position;
  });
  return listContentItems(moduleId);
}
