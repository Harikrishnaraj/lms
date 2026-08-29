'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge, Card, CardContent, ErrorState, FullPageLoader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@lms/ui';
import { isNotFound } from '../../../../../lib/api-client';
import { getAssignment, type Assignment } from '../../../../../lib/assignments-client';

type LoadState = 'loading' | 'error' | 'not-found' | 'ready';

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const res = await getAssignment(params.id);
      setAssignment(res);
      setState('ready');
    } catch (err) {
      setState(isNotFound(err) ? 'not-found' : 'error');
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state === 'not-found') return <ErrorState title="Assignment not found" />;
  if (state === 'error') return <ErrorState onRetry={() => void load()} />;
  if (state === 'loading' || !assignment) return <FullPageLoader label="Loading assignment" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/admin/hr/assignments" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to assignments
      </Link>

      <header>
        <h1 className="text-h2 text-foreground">{assignment.targetType === 'COURSE' ? assignment.course?.title : assignment.learningPath?.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{assignment.targetType === 'COURSE' ? 'Course' : 'Learning path'}</Badge>
          {assignment.isMandatory && <Badge variant="warning">Mandatory</Badge>}
          {assignment.dueDate && <span className="text-body-sm text-muted-foreground">Due {new Date(assignment.dueDate).toLocaleDateString()}</span>}
        </div>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Assigned by {assignment.createdBy.firstName} {assignment.createdBy.lastName} on {new Date(assignment.createdAt).toLocaleDateString()}
          {assignment.scopeType === 'DEPARTMENT' && assignment.department && <> to every active member of {assignment.department.name}</>}
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 text-label-lg text-foreground">Recipients ({assignment.recipients.length})</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignment.recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.firstName} {r.lastName}</TableCell>
                  <TableCell>{r.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
