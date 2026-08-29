'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Building2,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  BookOpen,
} from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import { getOrganization, type OrganizationProfile } from '../../../lib/organization-admin-client';
import { listUsers } from '../../../lib/users-client';
import { listDepartments } from '../../../lib/departments-client';
import { listCourses } from '../../../lib/courses-client';

interface SummaryStats {
  users: number;
  departments: number;
  courses: number;
}

export default function AdminOrganizationPage() {
  const [org, setOrg] = React.useState<OrganizationProfile | null>(null);
  const [stats, setStats] = React.useState<SummaryStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [orgData, usersData, deptsData, coursesData] = await Promise.all([
        getOrganization(),
        listUsers({ pageSize: 1 }),
        listDepartments(),
        listCourses({ pageSize: 1 }),
      ]);
      setOrg(orgData);
      setStats({
        users: usersData.total,
        departments: deptsData.length,
        courses: coursesData.total,
      });
    } catch {
      setError('Failed to load organization settings.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!org || !stats) return <FullPageLoader label="Loading organization overview" />;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h2 text-foreground">Organization Administration</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Manage system configurations, edit branding parameters, control user access roles and audit log trails.
        </p>
      </header>

      {/* Profile Overview */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-7" />
          </div>
          <div>
            <h2 className="text-h3 font-semibold text-foreground">{org.name}</h2>
            <p className="text-body-sm text-muted-foreground">Tenant Slug: {org.slug}</p>
            <p className="text-caption text-muted-foreground mt-0.5">
              Registered since: {new Date(org.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Active Users</p>
              <p className="text-h3 font-semibold text-foreground">{stats.users}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Departments</p>
              <p className="text-h3 font-semibold text-foreground">{stats.departments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Total Courses</p>
              <p className="text-h3 font-semibold text-foreground">{stats.courses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panels links */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Link
          href="/admin/organization/settings"
          className="group rounded-xl border border-border bg-surface p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
        >
          <Settings className="size-6 text-primary group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-body-md font-semibold text-foreground group-hover:text-primary transition-colors">
              System Settings
            </h3>
            <p className="text-caption text-muted-foreground mt-1">
              Configure tenant profile info, branding setups, and global timezone configs.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/organization/roles"
          className="group rounded-xl border border-border bg-surface p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
        >
          <UserCog className="size-6 text-primary group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-body-md font-semibold text-foreground group-hover:text-primary transition-colors">
              Roles & Permissions
            </h3>
            <p className="text-caption text-muted-foreground mt-1">
              Manage system permissions, elevate employees to trainers, managers or administrators.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/organization/audit"
          className="group rounded-xl border border-border bg-surface p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
        >
          <ShieldCheck className="size-6 text-primary group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-body-md font-semibold text-foreground group-hover:text-primary transition-colors">
              Security Audit Logs
            </h3>
            <p className="text-caption text-muted-foreground mt-1">
              Examine security operations logs, role modifications, and admin action trails.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
