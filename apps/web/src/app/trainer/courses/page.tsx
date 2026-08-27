'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button, EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import { CourseTable } from '../../../components/courses/CourseTable';
import { currentTrainerId, listCourses, type CourseRecord } from '../../../lib/courses-client';

export default function TrainerCoursesPage() {
  const [courses, setCourses] = React.useState<CourseRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setCourses(null);
    try {
      const result = await listCourses({ instructorId: currentTrainerId() });
      setCourses(result.items);
    } catch {
      setError('Something went wrong loading your courses.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">My courses</h1>
          <p className="mt-1 text-body-md text-muted-foreground">Courses you author and manage.</p>
        </div>
        <Button asChild>
          <Link href="/trainer/courses/new">
            <Plus className="size-4" aria-hidden="true" />
            New course
          </Link>
        </Button>
      </header>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !courses ? (
        <FullPageLoader label="Loading courses" />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create your first course to get started."
          action={
            <Button asChild size="sm">
              <Link href="/trainer/courses/new">New course</Link>
            </Button>
          }
        />
      ) : (
        <CourseTable courses={courses} detailHref={(id) => `/trainer/courses/${id}`} />
      )}
    </div>
  );
}
