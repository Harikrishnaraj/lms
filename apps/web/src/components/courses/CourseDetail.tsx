'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ErrorState,
  FullPageLoader,
} from '@lms/ui';
import { CourseBuilder } from './CourseBuilder';
import { CourseForm } from './CourseForm';
import {
  getCourse,
  listInstructors,
  setCourseStatus,
  STATUS_LABEL,
  updateCourse,
  type CourseRecord,
  type CourseStatus,
  type InstructorRef,
} from '../../lib/courses-client';

const NEXT_STATUSES: Record<CourseStatus, CourseStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

/** Shared course edit/status view, mounted at both /trainer/courses/[id] and /admin/hr/courses/[id]. */
export function CourseDetail({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [course, setCourse] = React.useState<CourseRecord | null>(null);
  const [instructors, setInstructors] = React.useState<InstructorRef[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusChanging, setStatusChanging] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, i] = await Promise.all([getCourse(id), listInstructors()]);
      setCourse(c);
      setInstructors(i);
    } catch (err) {
      setError({ status: (err as { status?: number }).status });
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FullPageLoader label="Loading course" />;
  if (error) {
    if (error.status === 404) {
      return <ErrorState title="Course not found" description="This course may have been removed." />;
    }
    return <ErrorState onRetry={() => void load()} />;
  }
  if (!course) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-foreground">{course.title}</h1>
          <Badge variant={course.status === 'PUBLISHED' ? 'success' : course.status === 'ARCHIVED' ? 'outline' : 'warning'} className="mt-2">
            {STATUS_LABEL[course.status]}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" disabled={statusChanging}>
              Change status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {NEXT_STATUSES[course.status].map((next) => (
              <DropdownMenuItem
                key={next}
                onClick={async () => {
                  setStatusChanging(true);
                  try {
                    setCourse(await setCourseStatus(course.id, next));
                  } finally {
                    setStatusChanging(false);
                  }
                }}
              >
                Move to {STATUS_LABEL[next]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Card>
        <CardContent className="p-6">
          <CourseForm
            instructors={instructors}
            initial={{
              title: course.title,
              description: course.description ?? '',
              difficulty: course.difficulty ?? '',
              durationMinutes: course.durationMinutes ? String(course.durationMinutes) : '',
              learningObjectives: course.learningObjectives,
              visibility: course.visibility,
              instructorId: course.instructor?.id ?? '',
              categories: course.categories,
            }}
            submitting={submitting}
            onCancel={() => router.push(backHref)}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                setCourse(
                  await updateCourse(course.id, {
                    title: values.title,
                    description: values.description || null,
                    difficulty: values.difficulty || null,
                    durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : null,
                    learningObjectives: values.learningObjectives,
                    visibility: values.visibility,
                    instructorId: values.instructorId || null,
                    categories: values.categories,
                  }),
                );
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <CourseBuilder courseId={course.id} />
    </div>
  );
}
