'use client';

/**
 * Client-side courses data source — mirrors users-client.ts / departments-
 * client.ts. Swap for real fetch('/api/v1/organizations/me/courses') calls
 * once frontend auth wiring lands; shapes already match the REST API.
 */

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseVisibility = 'PUBLIC' | 'PRIVATE';

export interface InstructorRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  difficulty: CourseDifficulty | null;
  durationMinutes: number | null;
  learningObjectives: string[];
  visibility: CourseVisibility;
  instructor: InstructorRef | null;
  categories: string[];
}

export interface PaginatedCourses {
  items: CourseRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListCoursesParams {
  search?: string;
  status?: CourseStatus;
  instructorId?: string;
  page?: number;
  pageSize?: number;
}

const CURRENT_TRAINER: InstructorRef = {
  id: 'u-3',
  firstName: 'Sam',
  lastName: 'Rivera',
  email: 'sam.rivera@demo-org.example',
};

const INSTRUCTORS: InstructorRef[] = [
  CURRENT_TRAINER,
  { id: 'u-2', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@demo-org.example' },
];

const COURSES: CourseRecord[] = [
  {
    id: 'course-1',
    title: 'Leadership Fundamentals',
    description: 'Core skills for first-time people managers.',
    status: 'PUBLISHED',
    difficulty: 'BEGINNER',
    durationMinutes: 120,
    learningObjectives: ['Give effective feedback', 'Run a 1:1'],
    visibility: 'PUBLIC',
    instructor: CURRENT_TRAINER,
    categories: ['Leadership'],
  },
  {
    id: 'course-2',
    title: 'Advanced Negotiation',
    description: 'Techniques for high-stakes negotiation.',
    status: 'DRAFT',
    difficulty: 'ADVANCED',
    durationMinutes: 90,
    learningObjectives: ['Anchor a negotiation', 'Handle objections'],
    visibility: 'PRIVATE',
    instructor: CURRENT_TRAINER,
    categories: ['Sales', 'Leadership'],
  },
  {
    id: 'course-3',
    title: 'Compliance Basics 2026',
    description: 'Annual mandatory compliance training.',
    status: 'PUBLISHED',
    difficulty: null,
    durationMinutes: 45,
    learningObjectives: [],
    visibility: 'PUBLIC',
    instructor: INSTRUCTORS[1],
    categories: ['Compliance'],
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function currentTrainerId(): string {
  return CURRENT_TRAINER.id;
}

export async function listInstructors(): Promise<InstructorRef[]> {
  await delay(200);
  return INSTRUCTORS;
}

export async function listCategories(): Promise<string[]> {
  await delay(150);
  return Array.from(new Set(COURSES.flatMap((c) => c.categories))).sort();
}

export async function listCourses(params: ListCoursesParams): Promise<PaginatedCourses> {
  await delay(400);
  const q = params.search?.toLowerCase();
  const filtered = COURSES.filter((c) => {
    if (params.status && c.status !== params.status) return false;
    if (params.instructorId && c.instructor?.id !== params.instructorId) return false;
    if (q && !c.title.toLowerCase().includes(q)) return false;
    return true;
  });
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

export async function getCourse(id: string): Promise<CourseRecord> {
  await delay(400);
  const course = COURSES.find((c) => c.id === id);
  if (!course) {
    const err = new Error('Course not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  return course;
}

export async function createCourse(input: {
  title: string;
  description?: string;
  difficulty?: CourseDifficulty;
  durationMinutes?: number;
  learningObjectives?: string[];
  visibility?: CourseVisibility;
  instructorId?: string;
  categories?: string[];
}): Promise<CourseRecord> {
  await delay(400);
  const instructor = input.instructorId ? (INSTRUCTORS.find((i) => i.id === input.instructorId) ?? null) : null;
  const created: CourseRecord = {
    id: `course-${COURSES.length + 1}`,
    title: input.title,
    description: input.description ?? null,
    status: 'DRAFT',
    difficulty: input.difficulty ?? null,
    durationMinutes: input.durationMinutes ?? null,
    learningObjectives: input.learningObjectives ?? [],
    visibility: input.visibility ?? 'PRIVATE',
    instructor,
    categories: input.categories ?? [],
  };
  COURSES.push(created);
  return created;
}

export async function updateCourse(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    difficulty?: CourseDifficulty | null;
    durationMinutes?: number | null;
    learningObjectives?: string[];
    visibility?: CourseVisibility;
    instructorId?: string | null;
    categories?: string[];
  },
): Promise<CourseRecord> {
  await delay(400);
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new Error('Course not found');
  if (input.title !== undefined) course.title = input.title;
  if (input.description !== undefined) course.description = input.description;
  if (input.difficulty !== undefined) course.difficulty = input.difficulty;
  if (input.durationMinutes !== undefined) course.durationMinutes = input.durationMinutes;
  if (input.learningObjectives !== undefined) course.learningObjectives = input.learningObjectives;
  if (input.visibility !== undefined) course.visibility = input.visibility;
  if (input.instructorId !== undefined) {
    course.instructor = input.instructorId ? (INSTRUCTORS.find((i) => i.id === input.instructorId) ?? null) : null;
  }
  if (input.categories !== undefined) course.categories = input.categories;
  return course;
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<CourseRecord> {
  await delay(400);
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new Error('Course not found');
  course.status = status;
  return course;
}

export const STATUS_LABEL: Record<CourseStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const DIFFICULTY_OPTIONS: CourseDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
export const STATUS_OPTIONS: CourseStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
