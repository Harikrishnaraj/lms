'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button, EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import {
  listAssessments,
  deleteAssessment,
  type AssessmentListItem,
} from '../../../lib/trainer-assessments-client';

export default function TrainerAssessmentsPage() {
  const [assessments, setAssessments] = React.useState<AssessmentListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setAssessments(null);
    try {
      const data = await listAssessments({ search: search || undefined, pageSize: 100 });
      setAssessments(data.items);
    } catch {
      setError('Failed to load assessments.');
    }
  }, [search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assessment? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteAssessment(id);
      setAssessments((prev) => prev?.filter((a) => a.id !== id) ?? null);
    } catch {
      alert('Cannot delete — assessment may already have learner attempts.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Assessments</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Create and manage quizzes for your courses.
          </p>
        </div>
        <Button asChild>
          <Link href="/trainer/assessments/new">
            <Plus className="size-4" aria-hidden="true" />
            New assessment
          </Link>
        </Button>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search assessments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !assessments ? (
        <FullPageLoader label="Loading assessments" />
      ) : assessments.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          description="Create your first quiz to assess learner knowledge."
          action={
            <Button asChild size="sm">
              <Link href="/trainer/assessments/new">New assessment</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Course</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Questions</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Attempts</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Passing Score</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 transition-colors hover:bg-hover">
                  <td className="px-4 py-3">
                    <Link href={`/trainer/assessments/${a.id}`} className="text-body-md font-medium text-foreground hover:text-primary">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">
                    {a.contentItem?.module.course.title ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm text-foreground tabular-nums">
                    {a._count.questions}
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm text-foreground tabular-nums">
                    {a._count.attempts}
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm text-foreground tabular-nums">
                    {a.passingScore}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void handleDelete(a.id)}
                      disabled={deleting === a.id}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Delete assessment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
