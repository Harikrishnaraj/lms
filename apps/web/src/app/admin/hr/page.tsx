'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Building2,
  ClipboardList,
  ShieldCheck,
  Users,
  BarChart3,
} from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { listCourses } from '../../../lib/courses-client';
import { listDepartments } from '../../../lib/departments-client';
import { listUsers } from '../../../lib/users-client';
import { listTeamEnrollments } from '../../../lib/manager-client';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: string;
  href: string;
}

function StatCard({ icon: Icon, label, value, accent, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-lg group-hover:scale-105 transition-transform"
          style={{ background: accent + '18', color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="text-h3 tabular-nums text-foreground group-hover:text-primary transition-colors">
            {value}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function AdminHrPage() {
  const [stats, setStats] = React.useState<{
    users: number;
    departments: number;
    courses: number;
    enrollments: number;
    completionRate: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [usersData, deptsData, coursesData, enrollsData] = await Promise.all([
        listUsers({ pageSize: 1 }),
        listDepartments(),
        listCourses({ pageSize: 1 }),
        listTeamEnrollments({ pageSize: 200 }),
      ]);

      const totalEnrollments = enrollsData.total;
      const completed = enrollsData.items.filter((e) => e.status === 'COMPLETED').length;
      const rate = totalEnrollments > 0 ? `${Math.round((completed / totalEnrollments) * 100)}%` : '0%';

      setStats({
        users: usersData.total,
        departments: deptsData.length,
        courses: coursesData.total,
        enrollments: totalEnrollments,
        completionRate: rate,
      });
    } catch {
      setError('Failed to load HR dashboard metrics.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!stats) return <FullPageLoader label="Loading overview metrics" />;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h2 text-foreground">HR & L&D Administration</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Manage corporate learning pathways, employee compliance, and organizational analytics.
        </p>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Employees" value={stats.users} accent="#6366f1" href="/admin/hr/users" />
        <StatCard icon={Building2} label="Departments" value={stats.departments} accent="#10b981" href="/admin/hr/departments" />
        <StatCard icon={BookOpen} label="Active Courses" value={stats.courses} accent="#f59e0b" href="/admin/hr/courses" />
        <StatCard icon={ClipboardList} label="Total Enrollments" value={stats.enrollments} accent="#8b5cf6" href="/admin/hr/assignments" />
        <StatCard icon={ShieldCheck} label="Completion Rate" value={stats.completionRate} accent="#ec4899" href="/admin/hr/compliance" />
      </div>

      {/* Main Admin Workspaces */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Compliance Workspace */}
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-6 text-primary" />
            <div>
              <h2 className="text-h4 text-foreground">Compliance & Tracking</h2>
              <p className="text-caption text-muted-foreground">Track mandatory training milestones</p>
            </div>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Ensure all departments maintain target compliance rates for health, safety, and security. Set up recurring alerts and compliance checks.
          </p>
          <Button asChild className="self-start mt-2">
            <Link href="/admin/hr/compliance">Track Compliance</Link>
          </Button>
        </div>

        {/* Analytics Workspace */}
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-6 text-primary" />
            <div>
              <h2 className="text-h4 text-foreground">Learning Analytics</h2>
              <p className="text-caption text-muted-foreground">Organization-wide learning trends</p>
            </div>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Deep-dive into employee learning times, active courses metrics, quiz grade distribution, and path completion durations.
          </p>
          <Button asChild variant="outline" className="self-start mt-2">
            <Link href="/admin/hr/analytics">View Analytics</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
