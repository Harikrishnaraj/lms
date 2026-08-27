'use client';

import * as React from 'react';
import { EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import { CourseTable } from '../../../../components/courses/CourseTable';
import { listCourses, type CourseRecord } from '../../../../lib/courses-client';

export default function AdminCoursesPage() {
  const [courses, setCourses] = React.useState<CourseRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setCourses(null);
    try {
      const result = await listCourses({});
      setCourses(result.items);
    } catch {
      setError('Something went wrong loading courses.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Courses</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          All courses across the organization, regardless of instructor.
        </p>
      </header>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !courses ? (
        <FullPageLoader label="Loading courses" />
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Courses created by trainers will appear here." />
      ) : (
        <CourseTable courses={courses} detailHref={(id) => `/admin/hr/courses/${id}`} />
      )}
    </div>
  );
}
