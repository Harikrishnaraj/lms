'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, FullPageLoader } from '@lms/ui';
import { createUser, listDepartments, type DepartmentRecord } from '../../../../../lib/users-client';
import { UserForm } from '../user-form';

export default function NewUserPage() {
  const router = useRouter();
  const [departments, setDepartments] = React.useState<DepartmentRecord[] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/hr/users"
        className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to users
      </Link>

      <div>
        <h1 className="text-h2 text-foreground">Invite a user</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Fill in the profile details. If the person doesn&apos;t have an Auth0 account yet, leave the
          Auth0 subject blank and they&apos;ll be marked as INVITED until their first login.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {!departments ? (
            <FullPageLoader label="Loading form" />
          ) : (
            <UserForm
              mode="create"
              departments={departments}
              submitting={submitting}
              onCancel={() => router.push('/admin/hr/users')}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  const created = await createUser({
                    email: values.email,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    jobTitle: values.jobTitle || undefined,
                    departmentId: values.departmentId || undefined,
                    externalId: values.externalId || undefined,
                    role: values.role || undefined,
                  });
                  router.push(`/admin/hr/users/${created.id}`);
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
