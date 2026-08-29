'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, FullPageLoader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@lms/ui';
import { LEARNING_PATH_STATUS_LABEL, listLearningPathsAdmin, type LearningPath } from '../../../../lib/learning-paths-client';

function statusBadgeVariant(status: LearningPath['status']): 'default' | 'success' | 'outline' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'ARCHIVED') return 'outline';
  return 'default';
}

export default function AdminLearningPathsPage() {
  const [paths, setPaths] = React.useState<LearningPath[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setPaths(null);
    try {
      const res = await listLearningPathsAdmin({});
      setPaths(res.items);
    } catch {
      setError('Something went wrong loading learning paths.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Learning paths</h1>
          <p className="mt-1 text-body-md text-muted-foreground">Ordered course bundles learners can join or be assigned.</p>
        </div>
        <Button asChild>
          <Link href="/admin/hr/learning-paths/new">
            <Plus className="size-4" aria-hidden="true" />
            New learning path
          </Link>
        </Button>
      </header>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !paths ? (
        <FullPageLoader label="Loading learning paths" />
      ) : paths.length === 0 ? (
        <EmptyState
          title="No learning paths yet"
          description="Create your first learning path to bundle courses together."
          action={<Button asChild size="sm"><Link href="/admin/hr/learning-paths/new">New learning path</Link></Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path) => (
              <TableRow key={path.id}>
                <TableCell>
                  <Link href={`/admin/hr/learning-paths/${path.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                    {path.title}
                  </Link>
                </TableCell>
                <TableCell>{path.courses.length}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(path.status)}>{LEARNING_PATH_STATUS_LABEL[path.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
