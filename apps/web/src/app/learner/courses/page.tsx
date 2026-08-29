'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@lms/ui';
import { isUnauthorized } from '../../../lib/api-client';
import {
  cancelEnrollment,
  listMyEnrollments,
  STATUS_LABEL,
  type EnrollmentRecord,
  type EnrollmentStatus,
} from '../../../lib/enrollments-client';

const ALL = '__all__';
const STATUS_FILTER_OPTIONS: EnrollmentStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

function statusBadgeVariant(status: EnrollmentStatus): 'default' | 'primary' | 'success' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'primary';
  return 'default';
}

type LoadState = 'loading' | 'error' | 'forbidden' | 'ready';

export default function MyLearningPage() {
  const [statusFilter, setStatusFilter] = React.useState<EnrollmentStatus | undefined>(undefined);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRecord[] | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const res = await listMyEnrollments({ status: statusFilter });
      setEnrollments(res.items);
      setState('ready');
    } catch (err) {
      setState(isUnauthorized(err) ? 'forbidden' : 'error');
    }
  }, [statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = React.useCallback(
    async (id: string) => {
      setCancellingId(id);
      try {
        await cancelEnrollment(id);
        await load();
      } catch {
        setState('error');
      } finally {
        setCancellingId(null);
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">My learning</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Courses you&apos;re enrolled in.</p>
      </header>

      <Select
        value={statusFilter ?? ALL}
        onValueChange={(next) => setStatusFilter(next === ALL ? undefined : (next as EnrollmentStatus))}
      >
        <SelectTrigger className="sm:w-48" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_FILTER_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {state === 'forbidden' ? (
        <ErrorState
          title="You don't have access to your enrollments"
          description="Ask your administrator if you believe this is a mistake."
        />
      ) : state === 'error' ? (
        <ErrorState onRetry={() => void load()} />
      ) : state === 'loading' ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : enrollments && enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments yet"
          description="Browse the catalog to find a course to get started."
          action={
            <Link href="/learner/catalog">
              <Button variant="secondary">Browse catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {enrollments?.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1.5">
                  <Link
                    href={`/learner/courses/${enrollment.id}`}
                    className="text-body-md font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {enrollment.course.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={statusBadgeVariant(enrollment.status)}>{STATUS_LABEL[enrollment.status]}</Badge>
                    {enrollment.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                    {enrollment.dueDate && (
                      <span className="text-body-sm text-muted-foreground">
                        Due {new Date(enrollment.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {enrollment.source === 'SELF' && enrollment.status !== 'COMPLETED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={cancellingId === enrollment.id}
                    onClick={() => void handleCancel(enrollment.id)}
                  >
                    {cancellingId === enrollment.id ? 'Cancelling…' : 'Cancel enrollment'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
