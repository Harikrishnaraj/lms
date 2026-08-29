'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Eye } from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { listTeamMembers } from '../../../../lib/manager-client';
import { listDepartments, type DepartmentRecord } from '../../../../lib/departments-client';
import { UserRecord } from '../../../../lib/users-client';

export default function ManagerTeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const deptParam = searchParams.get('departmentId') ?? '';
  const [departments, setDepartments] = React.useState<DepartmentRecord[] | null>(null);
  const [members, setMembers] = React.useState<UserRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const depts = await listDepartments();
      setDepartments(depts);

      // If no department selected but we have departments, select the first one by default
      const activeDeptId = deptParam || (depts[0]?.id ?? '');
      if (activeDeptId) {
        const membersData = await listTeamMembers({ departmentId: activeDeptId });
        setMembers(membersData.items);
      } else {
        setMembers([]);
      }
    } catch {
      setError('Failed to load team data.');
    }
  }, [deptParam]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const activeDeptId = deptParam || (departments?.[0]?.id ?? '');

  const handleDeptChange = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set('departmentId', id);
    else params.delete('departmentId');
    router.push(`/admin/manager/team?${params.toString()}`);
  };

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!departments || !members) return <FullPageLoader label="Loading team members" />;

  const filtered = search
    ? members.filter(
        (m) =>
          m.firstName.toLowerCase().includes(search.toLowerCase()) ||
          m.lastName.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          (m.jobTitle && m.jobTitle.toLowerCase().includes(search.toLowerCase())),
      )
    : members;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">My Team</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Track learning and completion states of employees in your department.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-body-sm font-medium text-muted-foreground">Department:</label>
          <select
            value={activeDeptId}
            onChange={(e) => handleDeptChange(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search team members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-12 text-center text-body-md text-muted-foreground">
          No team members found in this department.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Role/Job Title</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 transition-colors hover:bg-hover">
                  <td className="px-4 py-3 text-body-sm font-medium text-foreground">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">
                    {m.jobTitle ?? 'Employee'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/manager/team/${m.id}`}>
                        <Eye className="size-4 mr-1.5" />
                        View Progress
                      </Link>
                    </Button>
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
