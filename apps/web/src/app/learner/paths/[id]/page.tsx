'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck, Circle, CircleDot, Lock } from 'lucide-react';
import { Badge, Button, Card, CardContent, ErrorState, ProgressBar, Skeleton } from '@lms/ui';
import { isNotFound, isUnauthorized } from '../../../../lib/api-client';
import {
  enrollInLearningPath,
  getLearningPathCatalogEntry,
  LEARNING_PATH_PROGRESS_LABEL,
  type LearningPathWithProgress,
} from '../../../../lib/learning-paths-client';

type LoadState = 'loading' | 'error' | 'forbidden' | 'not-found' | 'ready';

function CourseStatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CircleCheck className="h-5 w-5 text-success" aria-hidden />;
  if (status === 'IN_PROGRESS') return <CircleDot className="h-5 w-5 text-primary" aria-hidden />;
  if (status === 'NOT_ENROLLED') return <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />;
  return <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />;
}

export default function LearningPathDetailPage() {
  const params = useParams<{ id: string }>();
  const [path, setPath] = React.useState<LearningPathWithProgress | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [enrolling, setEnrolling] = React.useState(false);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const res = await getLearningPathCatalogEntry(params.id);
      setPath(res);
      setState('ready');
    } catch (err) {
      if (isNotFound(err)) setState('not-found');
      else if (isUnauthorized(err)) setState('forbidden');
      else setState('error');
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleEnroll = React.useCallback(async () => {
    setEnrolling(true);
    try {
      await enrollInLearningPath(params.id);
      await load();
    } finally {
      setEnrolling(false);
    }
  }, [params.id, load]);

  if (state === 'forbidden') {
    return <ErrorState title="You don't have access to this learning path" description="Ask your administrator if you believe this is a mistake." />;
  }
  if (state === 'not-found') {
    return <ErrorState title="Learning path not found" description="It may have been unpublished or removed." />;
  }
  if (state === 'error') {
    return <ErrorState onRetry={() => void load()} />;
  }
  if (state === 'loading' || !path) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const required = path.progress.courses.filter((c) => c.isRequired);
  const completedRequired = required.filter((c) => c.enrollmentStatus === 'COMPLETED').length;
  const percent = required.length > 0 ? Math.round((completedRequired / required.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h2 text-foreground">{path.title}</h1>
            {path.description && <p className="mt-1 text-body-md text-muted-foreground">{path.description}</p>}
          </div>
          {!path.progress.isEnrolled && (
            <Button onClick={() => void handleEnroll()} disabled={enrolling}>
              {enrolling ? 'Joining…' : 'Join this path'}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={path.progress.status === 'COMPLETED' ? 'success' : path.progress.status === 'IN_PROGRESS' ? 'primary' : 'default'}>
            {LEARNING_PATH_PROGRESS_LABEL[path.progress.status]}
          </Badge>
          {path.progress.isMandatory && <Badge variant="warning">Mandatory</Badge>}
          {path.progress.dueDate && (
            <span className="text-body-sm text-muted-foreground">Due {new Date(path.progress.dueDate).toLocaleDateString()}</span>
          )}
        </div>
        {path.progress.isEnrolled && required.length > 0 && <ProgressBar value={percent} label="Required courses complete" showValue />}
      </header>

      <div className="flex flex-col gap-3">
        {path.progress.courses
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((course, index) => (
            <Card key={course.courseId}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="text-body-sm font-medium text-muted-foreground">{index + 1}</span>
                <CourseStatusIcon status={course.enrollmentStatus} />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-body-md font-medium text-foreground">{course.title}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={course.isRequired ? 'outline' : 'default'}>{course.isRequired ? 'Required' : 'Optional'}</Badge>
                    {course.enrollmentStatus !== 'NOT_ENROLLED' && (
                      <span className="text-body-sm text-muted-foreground">
                        {course.enrollmentStatus === 'COMPLETED' ? 'Completed' : course.enrollmentStatus === 'IN_PROGRESS' ? 'In progress' : 'Not started'}
                      </span>
                    )}
                  </div>
                </div>
                {course.enrollmentId && (
                  <Link href={`/learner/courses/${course.enrollmentId}`}>
                    <Button variant="secondary" size="sm">
                      {course.enrollmentStatus === 'NOT_STARTED' ? 'Start' : 'Continue'}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
