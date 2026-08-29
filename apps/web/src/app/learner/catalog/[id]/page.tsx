'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge, Button, Card, CardContent, ErrorState, FullPageLoader } from '@lms/ui';
import { isNotFound, isUnauthorized } from '../../../../lib/api-client';
import {
  DIFFICULTY_LABEL,
  ENROLLMENT_STATUS_LABEL,
  getCatalogCourse,
  type CatalogCourse,
} from '../../../../lib/catalog-client';
import { selfEnroll } from '../../../../lib/enrollments-client';

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export default function LearnerCatalogDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [course, setCourse] = React.useState<CatalogCourse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  const [enrolling, setEnrolling] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourse(await getCatalogCourse(id));
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
    if (isNotFound(error)) {
      return <ErrorState title="Course not found" description="This course may no longer be available." />;
    }
    if (isUnauthorized(error)) {
      return (
        <ErrorState
          title="You don't have access to this course"
          description="Ask your administrator if you believe this is a mistake."
        />
      );
    }
    return <ErrorState onRetry={() => void load()} />;
  }
  if (!course) return null;

  const duration = formatDuration(course.durationMinutes);
  const isEnrolled = course.enrollmentStatus !== 'NOT_ENROLLED';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/learner/catalog"
        className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to catalog
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-foreground">{course.title}</h1>
          {course.instructor && (
            <p className="mt-1 text-body-sm text-muted-foreground">
              {course.instructor.firstName} {course.instructor.lastName}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {course.difficulty && <Badge variant="outline">{DIFFICULTY_LABEL[course.difficulty]}</Badge>}
            {course.isMandatory && <Badge variant="warning">Mandatory</Badge>}
            {isEnrolled && <Badge variant="primary">{ENROLLMENT_STATUS_LABEL[course.enrollmentStatus]}</Badge>}
          </div>
        </div>
        {isEnrolled ? (
          <Link href="/learner/courses">
            <Button variant="secondary">Go to my learning</Button>
          </Link>
        ) : (
          <Button
            disabled={enrolling}
            onClick={async () => {
              setEnrolling(true);
              try {
                await selfEnroll(course.id);
                await load();
              } finally {
                setEnrolling(false);
              }
            }}
          >
            {enrolling ? 'Enrolling…' : 'Enroll'}
          </Button>
        )}
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          {course.description && <p className="text-body-md text-foreground">{course.description}</p>}

          <dl className="grid grid-cols-2 gap-4 text-body-sm">
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="text-foreground">{duration ?? 'Not specified'}</dd>
            </div>
            {course.dueDate && (
              <div>
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="text-foreground">{new Date(course.dueDate).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>

          {course.categories.length > 0 && (
            <div>
              <p className="mb-1.5 text-body-sm text-muted-foreground">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {course.categories.map((category) => (
                  <Badge key={category.id} variant="default">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {course.learningObjectives.length > 0 && (
            <div>
              <p className="mb-1.5 text-body-sm text-muted-foreground">What you&apos;ll learn</p>
              <ul className="list-inside list-disc text-body-sm text-foreground">
                {course.learningObjectives.map((objective, index) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
