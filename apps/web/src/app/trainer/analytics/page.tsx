'use client';

import * as React from 'react';
import { BookOpen, Users, Trophy } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import { getCourseAnalytics, type CourseAnalyticsItem } from '../../../lib/analytics-client';

export default function TrainerAnalyticsPage() {
  const [courses, setCourses] = React.useState<CourseAnalyticsItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setCourses(null);
    try {
      const data = await getCourseAnalytics();
      setCourses(data);
    } catch {
      setError('Failed to load analytics.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!courses) return <FullPageLoader label="Loading analytics" />;

  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.status === 'PUBLISHED').length;
  const totalEnrollments = courses.reduce((sum, c) => sum + c.totalEnrollments, 0);
  const totalCompleted = courses.reduce((sum, c) => sum + c.completedCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Course Analytics</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Overview of course performance, enrollment counts, and assessment engagement.
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={BookOpen} label="Total Courses" value={totalCourses} color="#6366f1" />
        <SummaryCard icon={BookOpen} label="Published" value={publishedCourses} color="#10b981" />
        <SummaryCard icon={Users} label="Total Enrollments" value={totalEnrollments} color="#ec4899" />
        <SummaryCard icon={Trophy} label="Completed Courses" value={totalCompleted} color="#8b5cf6" />
      </div>

      {/* Per-Course Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-h4 text-foreground">Course Breakdown</h2>
        </div>
        {courses.length === 0 ? (
          <p className="p-12 text-center text-body-md text-muted-foreground">
            No courses to analyze yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Course</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Enrollments</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Completions</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Completion Rate</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Avg Quiz Score</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((item) => (
                <tr
                  key={item.courseId}
                  className="border-b border-border last:border-0 transition-colors hover:bg-hover"
                >
                  <td className="px-4 py-3">
                    <p className="text-body-md font-medium text-foreground">{item.title}</p>
                    {item.difficulty && (
                      <p className="text-caption text-muted-foreground">{item.difficulty}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === 'PUBLISHED'
                          ? 'bg-green-500/10 text-green-600'
                          : item.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-gray-500/10 text-gray-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                    {item.totalEnrollments}
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                    {item.completedCount}
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm tabular-nums font-semibold text-foreground">
                    {item.completionRate}%
                  </td>
                  <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                    {item.averageScore !== null ? `${item.averageScore}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-lg"
          style={{ background: color + '18', color }}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="text-h3 tabular-nums text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
