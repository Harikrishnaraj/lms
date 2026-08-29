'use client';

import * as React from 'react';
import { BarChart3, TrendingUp, Users, Trophy, Award } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import { getOverviewAnalytics, type OverviewMetrics } from '../../../../lib/analytics-client';

export default function AdminHrAnalyticsPage() {
  const [stats, setStats] = React.useState<OverviewMetrics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await getOverviewAnalytics();
      setStats(data);
    } catch {
      setError('Failed to load learning analytics.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!stats) return <FullPageLoader label="Loading learning analytics" />;

  const maxCount = Math.max(...stats.weeklyTrends.map((t) => t.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Learning Analytics</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Organization-wide performance indicators, training stats, and quiz aggregates.
        </p>
      </header>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Total Learners</p>
              <p className="text-h3 font-semibold text-foreground">{stats.totalLearners}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Total Enrollments</p>
              <p className="text-h3 font-semibold text-foreground">{stats.totalEnrollments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Completion Rate</p>
              <p className="text-h3 font-semibold text-foreground">{stats.completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Avg Quiz Score</p>
              <p className="text-h3 font-semibold text-foreground">{stats.averageAssessmentScore}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Certificates</p>
              <p className="text-h3 font-semibold text-foreground">{stats.totalCertificatesIssued}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trends Chart */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-h4 text-foreground mb-4 font-semibold">Weekly Completion Trends</h2>
        <div className="flex items-end justify-between h-48 border-b border-l border-border px-4 py-2 gap-4">
          {stats.weeklyTrends.map((trend, idx) => {
            const heightPercent = Math.max(Math.round((trend.count / maxCount) * 90), 10);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full max-w-[64px] bg-primary/20 hover:bg-primary/40 transition-colors rounded-t flex justify-center items-center text-caption text-foreground"
                  style={{ height: `${heightPercent}%` }}
                >
                  {trend.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-caption text-muted-foreground px-4">
          {stats.weeklyTrends.map((trend, idx) => (
            <span key={idx} className="flex-1 text-center">{trend.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
