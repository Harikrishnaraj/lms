'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import {
  listAssessments,
  listAttempts,
  type AttemptRecord,
} from '../../../lib/trainer-assessments-client';

interface SubmissionRow extends AttemptRecord {
  assessmentId: string;
  assessmentTitle: string;
  courseTitle: string;
}

export default function TrainerSubmissionsPage() {
  const [rows, setRows] = React.useState<SubmissionRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const load = React.useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      const assessmentsData = await listAssessments({ pageSize: 200 });
      const withAttempts = assessmentsData.items.filter((a) => a._count.attempts > 0);

      const allAttempts = await Promise.all(
        withAttempts.map(async (a) => {
          const attempts = await listAttempts(a.id);
          return attempts.map((attempt: AttemptRecord) => ({
            ...attempt,
            assessmentId: a.id,
            assessmentTitle: a.title,
            courseTitle: a.contentItem?.module.course.title ?? 'Standalone',
          }));
        }),
      );

      const flat = allAttempts
        .flat()
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setRows(flat);
    } catch {
      setError('Failed to load submissions.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!rows) return <FullPageLoader label="Loading submissions" />;

  const filtered = search
    ? rows.filter(
        (r) =>
          r.assessmentTitle.toLowerCase().includes(search.toLowerCase()) ||
          (r.user && `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(search.toLowerCase())),
      )
    : rows;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Submissions</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          All learner quiz attempts across your assessments.
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by assessment or learner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-12 text-center text-body-md text-muted-foreground">
          {search ? 'No matching submissions found.' : 'No submissions yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Learner</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Assessment</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Course</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Score</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Result</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 transition-colors hover:bg-hover">
                  <td className="px-4 py-3 text-body-sm text-foreground">
                    {row.user ? `${row.user.firstName} ${row.user.lastName}` : row.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/trainer/assessments/${row.assessmentId ?? ''}`}
                      className="text-body-sm text-foreground hover:text-primary"
                    >
                      {row.assessmentTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{row.courseTitle}</td>
                  <td className="px-4 py-3 text-center text-body-sm font-medium tabular-nums text-foreground">
                    {row.score}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.passed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                        <CheckCircle2 className="size-3.5" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        <XCircle className="size-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">
                    {new Date(row.submittedAt).toLocaleDateString()}
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
