'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FullPageLoader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lms/ui';
import { listDepartments, STATUS_LABEL, type DepartmentRecord } from '../../../../lib/departments-client';

export default function DepartmentsListPage() {
  const [departments, setDepartments] = React.useState<DepartmentRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setDepartments(null);
    try {
      setDepartments(await listDepartments());
    } catch {
      setError('Something went wrong loading departments.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Departments</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Group users into departments and assign a manager to each.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/hr/departments/new">
            <Plus className="size-4" aria-hidden="true" />
            New department
          </Link>
        </Button>
      </header>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !departments ? (
        <FullPageLoader label="Loading departments" />
      ) : departments.length === 0 ? (
        <EmptyState
          title="No departments yet"
          description="Create your first department to start grouping users."
          action={
            <Button asChild size="sm">
              <Link href="/admin/hr/departments/new">New department</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link href={`/admin/hr/departments/${d.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                    {d.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{d.userCount}</TableCell>
                <TableCell>
                  <Badge variant={d.status === 'ACTIVE' ? 'success' : 'outline'}>{STATUS_LABEL[d.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
