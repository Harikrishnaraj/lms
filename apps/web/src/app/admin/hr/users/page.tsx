'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  EmptyState,
  FullPageLoader,
  Pagination,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lms/ui';
import {
  listDepartments,
  listUsers,
  ROLE_LABEL,
  ROLE_OPTIONS,
  STATUS_LABEL,
  STATUS_OPTIONS,
  type DepartmentRecord,
  type MockScenario,
  type PaginatedUsers,
  type RoleKey,
  type UserStatus,
} from '../../../../lib/users-client';

const PAGE_SIZE = 25;
const ANY = '__any__';

export default function UsersListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Scenario switch for the "loading / empty / error / permission-denied"
  // states the task requires — swap once the real API is wired.
  const scenario: MockScenario = (searchParams.get('scenario') as MockScenario) ?? 'default';

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [status, setStatus] = React.useState<UserStatus | ''>('');
  const [role, setRole] = React.useState<RoleKey | ''>('');
  const [departmentId, setDepartmentId] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const [users, setUsers] = React.useState<PaginatedUsers | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number; message: string } | null>(null);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  // Reset to page 1 whenever filters change so we don't ask for a page
  // that no longer exists in the filtered set.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, role, departmentId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, departments] = await Promise.all([
        listUsers(
          {
            search: debouncedSearch || undefined,
            status: status || undefined,
            role: role || undefined,
            departmentId: departmentId || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          scenario,
        ),
        listDepartments(scenario === 'forbidden' || scenario === 'error' ? 'default' : scenario),
      ]);
      setUsers(users);
      setDepartments(departments);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      setError({ status: e.status, message: e.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, role, departmentId, page, scenario]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Users</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Manage everyone in your organization — create accounts, invite new members, and assign roles.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/hr/users/new">
            <Plus className="size-4" aria-hidden="true" />
            Invite user
          </Link>
        </Button>
      </header>

      <ScenarioBar
        current={scenario}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          if (next === 'default') params.delete('scenario');
          else params.set('scenario', next);
          router.push(`?${params.toString()}`, { scroll: false });
        }}
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,180px))]">
        <SearchInput
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search name or email…"
          aria-label="Search users"
        />
        <Select value={status || ANY} onValueChange={(v) => setStatus(v === ANY ? '' : (v as UserStatus))}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role || ANY} onValueChange={(v) => setRole(v === ANY ? '' : (v as RoleKey))}>
          <SelectTrigger aria-label="Filter by role">
            <SelectValue placeholder="Any role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any role</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentId || ANY} onValueChange={(v) => setDepartmentId(v === ANY ? '' : v)}>
          <SelectTrigger aria-label="Filter by department">
            <SelectValue placeholder="Any department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !users ? (
        <FullPageLoader label="Loading users" />
      ) : error ? (
        error.status === 403 ? (
          <ErrorState
            title="You don't have permission to view users"
            description="Ask your organization administrator to grant you the user:view permission."
          />
        ) : (
          <ErrorState onRetry={() => void load()} />
        )
      ) : users && users.items.length === 0 ? (
        <EmptyState
          title="No users match your filters"
          description="Try clearing filters, changing your search, or inviting a new user."
          action={
            <Button asChild size="sm">
              <Link href="/admin/hr/users/new">Invite user</Link>
            </Button>
          }
        />
      ) : users ? (
        <>
          <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/admin/hr/users/${user.id}`}
                        className="flex items-center gap-3 hover:text-primary hover:underline"
                      >
                        <Avatar size="sm" fallback={initialsFor(user.firstName, user.lastName)} />
                        <span className="flex flex-col leading-tight">
                          <span className="text-body-sm font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-body-sm text-muted-foreground">{user.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{user.role ? <Badge variant="primary">{ROLE_LABEL[user.role]}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{user.department?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{user.jobTitle ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">
              Showing {(users.page - 1) * users.pageSize + 1}–{Math.min(users.page * users.pageSize, users.total)} of {users.total}
            </p>
            {users.total > users.pageSize && (
              <Pagination page={users.page} pageCount={Math.ceil(users.total / users.pageSize)} onPageChange={setPage} />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ScenarioBar({ current, onChange }: { current: MockScenario; onChange: (next: MockScenario) => void }) {
  const scenarios: { key: MockScenario; label: string }[] = [
    { key: 'default', label: 'Default' },
    { key: 'empty', label: 'Empty' },
    { key: 'error', label: 'Error' },
    { key: 'forbidden', label: 'Permission denied' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-navy-50/50 px-3 py-2 text-body-sm">
      <span className="text-muted-foreground">Preview state:</span>
      {scenarios.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          className={
            s.key === current
              ? 'rounded-sm bg-primary px-2 py-0.5 text-label-sm text-on-primary'
              : 'rounded-sm px-2 py-0.5 text-label-sm text-muted-foreground hover:bg-navy-100'
          }
        >
          {s.label}
        </button>
      ))}
      <span className="ml-auto text-label-sm text-muted-foreground">
        For the API-integration phase this row goes away.
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
  if (status === 'INACTIVE') return <Badge variant="error">Inactive</Badge>;
  return <Badge variant="warning">Invited</Badge>;
}

function initialsFor(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}
