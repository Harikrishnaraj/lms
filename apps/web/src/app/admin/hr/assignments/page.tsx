'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, FullPageLoader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@lms/ui';
import { listAssignments, type Assignment } from '../../../../lib/assignments-client';

function targetLabel(a: Assignment): string {
  return a.targetType === 'COURSE' ? (a.course?.title ?? 'Unknown course') : (a.learningPath?.title ?? 'Unknown path');
}

function scopeLabel(a: Assignment): string {
  if (a.scopeType === 'USER') return a.targetUser ? `${a.targetUser.firstName} ${a.targetUser.lastName}` : 'Unknown user';
  return a.department ? `${a.department.name} (dept)` : 'Unknown department';
}

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = React.useState<Assignment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setAssignments(null);
    try {
      const res = await listAssignments({});
      setAssignments(res.items);
    } catch {
      setError('Something went wrong loading assignments.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Assignments</h1>
          <p className="mt-1 text-body-md text-muted-foreground">Courses and learning paths assigned to people or departments.</p>
        </div>
        <Button asChild>
          <Link href="/admin/hr/assignments/new">
            <Plus className="size-4" aria-hidden="true" />
            New assignment
          </Link>
        </Button>
      </header>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !assignments ? (
        <FullPageLoader label="Loading assignments" />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Assign a course or learning path to a person or department to get started."
          action={<Button asChild size="sm"><Link href="/admin/hr/assignments/new">New assignment</Link></Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assigned</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Mandatory</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Created by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/admin/hr/assignments/${a.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                    {targetLabel(a)}
                  </Link>
                  <div className="text-body-sm text-muted-foreground">{a.targetType === 'COURSE' ? 'Course' : 'Learning path'}</div>
                </TableCell>
                <TableCell>{scopeLabel(a)}</TableCell>
                <TableCell>{a.recipientCount}</TableCell>
                <TableCell>{a.isMandatory ? <Badge variant="warning">Mandatory</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{a.createdBy.firstName} {a.createdBy.lastName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
