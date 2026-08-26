'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
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
} from '@lms/ui';
import {
  getUser,
  listDepartments,
  ROLE_LABEL,
  setUserStatus,
  STATUS_LABEL,
  updateUser,
  type DepartmentRecord,
  type UserRecord,
} from '../../../../../lib/users-client';
import { UserForm } from '../user-form';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = React.useState<UserRecord | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number; message: string } | null>(null);
  const [statusChanging, setStatusChanging] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, d] = await Promise.all([getUser(id), listDepartments()]);
      setUser(u);
      setDepartments(d);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      setError({ status: e.status, message: e.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FullPageLoader label="Loading user" />;
  if (error) {
    if (error.status === 403) {
      return (
        <ErrorState
          title="You don't have permission to view this user"
          description="Ask your organization administrator to grant you the user:view permission."
        />
      );
    }
    if (error.status === 404) {
      return (
        <ErrorState
          title="User not found"
          description="This user may have been removed, or the link is incorrect."
        />
      );
    }
    return <ErrorState onRetry={() => void load()} />;
  }
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const canToggleStatus = user.status !== 'INVITED';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/admin/hr/users"
        className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to users
      </Link>

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Avatar size="xl" fallback={initials} />
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 text-foreground">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-body-md text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={user.status} />
              {user.role && <Badge variant="primary">{ROLE_LABEL[user.role]}</Badge>}
              {user.department && <Badge variant="outline">{user.department.name}</Badge>}
            </div>
          </div>
        </div>
        {canToggleStatus && (
          <Modal>
            <ModalTrigger asChild>
              <Button variant={user.status === 'ACTIVE' ? 'secondary' : 'primary'} disabled={statusChanging}>
                {user.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
              </Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>
                  {nextStatus === 'INACTIVE' ? 'Deactivate this user?' : 'Reactivate this user?'}
                </ModalTitle>
                <ModalDescription>
                  {nextStatus === 'INACTIVE'
                    ? 'The user will lose access to the platform. Their history and enrollments are preserved.'
                    : 'The user will regain access to the platform with their previous role.'}
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <ModalClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </ModalClose>
                <ModalClose asChild>
                  <Button
                    variant={nextStatus === 'INACTIVE' ? 'destructive' : 'primary'}
                    loading={statusChanging}
                    onClick={async () => {
                      setStatusChanging(true);
                      try {
                        const updated = await setUserStatus(user.id, nextStatus);
                        setUser(updated);
                      } finally {
                        setStatusChanging(false);
                      }
                    }}
                  >
                    {nextStatus === 'INACTIVE' ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </ModalClose>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </header>

      {user.status === 'INVITED' && (
        <Alert variant="warning" title="This user hasn't signed in yet">
          They&apos;ll be marked as Active once they complete their first Auth0 login. Deactivation is available
          after that.
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-h4 text-foreground">Profile</h2>
          <UserForm
            mode="edit"
            departments={departments}
            initial={{
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              jobTitle: user.jobTitle ?? '',
              departmentId: user.department?.id ?? '',
              role: user.role ?? '',
            }}
            submitting={submitting}
            onCancel={() => router.push('/admin/hr/users')}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                const updated = await updateUser(user.id, {
                  firstName: values.firstName,
                  lastName: values.lastName,
                  jobTitle: values.jobTitle || null,
                  departmentId: values.departmentId || null,
                  role: values.role || null,
                });
                setUser(updated);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: UserRecord['status'] }) {
  if (status === 'ACTIVE') return <Badge variant="success">{STATUS_LABEL[status]}</Badge>;
  if (status === 'INACTIVE') return <Badge variant="error">{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="warning">{STATUS_LABEL[status]}</Badge>;
}
