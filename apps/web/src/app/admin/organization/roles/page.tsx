'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import {
  listMembers,
  assignRole,
  type MembershipRecord,
  type RoleKey,
  ROLE_LABELS,
} from '../../../../lib/organization-admin-client';

export default function UserRolesPage() {
  const [members, setMembers] = React.useState<MembershipRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await listMembers();
      setMembers(data);
    } catch {
      setError('Failed to load user memberships.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (userId: string, newRole: RoleKey) => {
    setUpdatingId(userId);
    try {
      const updated = await assignRole(userId, newRole);
      setMembers((prev) =>
        prev
          ? prev.map((m) => (m.userId === userId ? { ...m, role: updated.role } : m))
          : prev,
      );
      alert('User role updated successfully!');
    } catch {
      alert('Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!members) return <FullPageLoader label="Loading memberships" />;

  const filtered = search
    ? members.filter(
        (m) =>
          m.user &&
          `${m.user.firstName} ${m.user.lastName} ${m.user.email}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : members;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">User Roles & Permissions</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Manage employee roles and authorization boundaries.
        </p>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-12 text-center text-body-md text-muted-foreground">
          No members found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Current Role</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-border last:border-0 transition-colors hover:bg-hover"
                >
                  <td className="px-4 py-3 text-body-sm font-medium text-foreground">
                    {m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">
                    {m.user?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-foreground">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {m.role?.key ? ROLE_LABELS[m.role.key] : 'No Role'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={m.role?.key ?? ''}
                      onChange={(e) => void handleRoleChange(m.userId, e.target.value as RoleKey)}
                      disabled={updatingId === m.userId}
                      className="h-9 rounded border border-border bg-surface px-2 text-body-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">Select role…</option>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
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
