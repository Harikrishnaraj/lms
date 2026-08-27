'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, FullPageLoader } from '@lms/ui';
import { createDepartment, listManagers, type ManagerRef } from '../../../../../lib/departments-client';
import { DepartmentForm } from '../department-form';

export default function NewDepartmentPage() {
  const router = useRouter();
  const [managers, setManagers] = React.useState<ManagerRef[] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    listManagers().then(setManagers).catch(() => setManagers([]));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/admin/hr/departments" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to departments
      </Link>

      <div>
        <h1 className="text-h2 text-foreground">New department</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          {!managers ? (
            <FullPageLoader label="Loading form" />
          ) : (
            <DepartmentForm
              managers={managers}
              submitting={submitting}
              submitLabel="Create department"
              onCancel={() => router.push('/admin/hr/departments')}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  const created = await createDepartment({ name: values.name, managerId: values.managerId || undefined });
                  router.push(`/admin/hr/departments/${created.id}`);
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
