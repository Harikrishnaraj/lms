'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, LineChart } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  FullPageLoader,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lms/ui';
import {
  getDepartment,
  listManagers,
  setDepartmentStatus,
  STATUS_LABEL,
  updateDepartment,
  type DepartmentRecord,
  type ManagerRef,
} from '../../../../../lib/departments-client';
import { listUsers, type UserRecord } from '../../../../../lib/users-client';
import { DepartmentForm } from '../department-form';

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [department, setDepartment] = React.useState<DepartmentRecord | null>(null);
  const [managers, setManagers] = React.useState<ManagerRef[]>([]);
  const [members, setMembers] = React.useState<UserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusChanging, setStatusChanging] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dept, mgrs] = await Promise.all([getDepartment(id), listManagers()]);
      setDepartment(dept);
      setManagers(mgrs);
      const users = await listUsers({ departmentId: dept.id });
      setMembers(users.items);
    } catch (err) {
      setError({ status: (err as { status?: number }).status });
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FullPageLoader label="Loading department" />;
  if (error) {
    if (error.status === 404) {
      return <ErrorState title="Department not found" description="This department may have been removed." />;
    }
    return <ErrorState onRetry={() => void load()} />;
  }
  if (!department) return null;

  const nextStatus = department.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin/hr/departments" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to departments
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-foreground">{department.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={department.status === 'ACTIVE' ? 'success' : 'outline'}>{STATUS_LABEL[department.status]}</Badge>
            <Badge variant="outline">{department.userCount} member{department.userCount === 1 ? '' : 's'}</Badge>
          </div>
        </div>
        <Modal>
          <ModalTrigger asChild>
            <Button variant={department.status === 'ACTIVE' ? 'secondary' : 'primary'} disabled={statusChanging}>
              {department.status === 'ACTIVE' ? 'Archive' : 'Restore'}
            </Button>
          </ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{nextStatus === 'ARCHIVED' ? 'Archive this department?' : 'Restore this department?'}</ModalTitle>
              <ModalDescription>
                {nextStatus === 'ARCHIVED'
                  ? 'Archived departments are hidden from the active list but their members and history are preserved.'
                  : 'The department will reappear in the active list.'}
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancel</Button>
              </ModalClose>
              <ModalClose asChild>
                <Button
                  variant={nextStatus === 'ARCHIVED' ? 'destructive' : 'primary'}
                  loading={statusChanging}
                  onClick={async () => {
                    setStatusChanging(true);
                    try {
                      setDepartment(await setDepartmentStatus(department.id, nextStatus));
                    } finally {
                      setStatusChanging(false);
                    }
                  }}
                >
                  {nextStatus === 'ARCHIVED' ? 'Archive' : 'Restore'}
                </Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </header>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-h4 text-foreground">Details</h2>
          <DepartmentForm
            managers={managers}
            initial={{ name: department.name, managerId: department.manager?.id ?? '' }}
            submitting={submitting}
            onCancel={() => router.push('/admin/hr/departments')}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                setDepartment(await updateDepartment(department.id, { name: values.name, managerId: values.managerId || null }));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-h4 text-foreground">Members</h2>
          {members.length === 0 ? (
            <EmptyState title="No members yet" description="Assign users to this department from their profile page." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/admin/hr/users/${u.id}`} className="hover:text-primary hover:underline">
                        {u.firstName} {u.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{u.jobTitle ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-h4 text-foreground">Learning metrics</h2>
          <EmptyState
            icon={<LineChart className="size-6" aria-hidden="true" />}
            title="Not available yet"
            description="Learning metrics will appear here once the course and enrollment system is in place."
          />
        </CardContent>
      </Card>
    </div>
  );
}
