'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, BookOpen, ClipboardList, Users } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import { listDepartments, type DepartmentRecord } from '../../../lib/departments-client';

interface TeamOverview {
  departments: DepartmentRecord[];
  totalMembers: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-lg"
          style={{ background: accent + '18', color: accent }}
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

export default function AdminManagerPage() {
  const [overview, setOverview] = React.useState<TeamOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setOverview(null);
    try {
      const departments = await listDepartments();
      const totalMembers = departments.reduce((sum: number, d: DepartmentRecord) => sum + (d.userCount ?? 0), 0);
      setOverview({ departments, totalMembers });
    } catch {
      setError('Failed to load manager dashboard.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!overview) return <FullPageLoader label="Loading dashboard" />;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h2 text-foreground">Manager Dashboard</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Monitor your team&apos;s learning progress and manage assignments.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Team Members" value={overview.totalMembers} accent="#6366f1" />
        <StatCard icon={BookOpen} label="Departments" value={overview.departments.length} accent="#10b981" />
        <StatCard icon={ClipboardList} label="Active Assignments" value="—" accent="#f59e0b" />
        <StatCard icon={BarChart3} label="Completion Rate" value="—" accent="#ec4899" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-h4 text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/manager/team"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-hover"
            >
              <Users className="size-5 text-primary" />
              <div>
                <p className="text-body-md font-medium text-foreground">View My Team</p>
                <p className="text-caption text-muted-foreground">See team members and their progress</p>
              </div>
            </Link>
            <Link
              href="/admin/manager/assignments"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-hover"
            >
              <ClipboardList className="size-5 text-primary" />
              <div>
                <p className="text-body-md font-medium text-foreground">Assign Training</p>
                <p className="text-caption text-muted-foreground">Assign courses to your team members</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Departments */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-h4 text-foreground mb-4">My Departments</h2>
          {overview.departments.length === 0 ? (
            <p className="py-8 text-center text-body-md text-muted-foreground">
              No departments assigned to you.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {overview.departments.map((dept) => (
                <Link
                  key={dept.id}
                  href={`/admin/manager/team?departmentId=${dept.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-hover"
                >
                  <div>
                    <p className="text-body-md font-medium text-foreground">{dept.name}</p>
                    <p className="text-caption text-muted-foreground">
                      {dept.userCount ?? 0} members
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      dept.status === 'ACTIVE'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    {dept.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
