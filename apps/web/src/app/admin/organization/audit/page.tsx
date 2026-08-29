'use client';

import * as React from 'react';
import { ShieldCheck, Search, Clock } from 'lucide-react';
import { Button, EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import { listAuditLogs, type AuditLogItem } from '../../../../lib/audit-client';

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLogItem[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        page,
        pageSize: 20,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-h2 text-foreground font-semibold">Security Audit Logs</h1>
            <p className="mt-1 text-body-md text-muted-foreground">
              Immutable ledger of administrative actions, course status transitions, and security events.
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by action (e.g. course:publish, user:role_change)…"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">All Entity Types</option>
          <option value="Course">Course</option>
          <option value="User">User</option>
          <option value="Membership">Membership</option>
          <option value="Assessment">Assessment</option>
          <option value="Organization">Organization</option>
        </select>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={() => void load()} />
      ) : loading && !logs ? (
        <FullPageLoader label="Loading audit logs" />
      ) : logs && logs.length === 0 ? (
        <EmptyState
          title="No audit logs recorded"
          description="No administrative or security actions have matched your current filter criteria."
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left bg-muted/40">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                  <td className="px-4 py-3 text-caption text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary font-mono">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-foreground">
                    <span className="font-medium">{item.entityType}</span>
                    {item.entityId && (
                      <span className="ml-1.5 text-caption text-muted-foreground font-mono">
                        ({item.entityId.slice(0, 8)}…)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-foreground">
                    {item.actor ? (
                      <div>
                        <p className="font-medium">{item.actor.firstName} {item.actor.lastName}</p>
                        <p className="text-caption text-muted-foreground">{item.actor.email}</p>
                      </div>
                    ) : (
                      <span className="text-caption text-muted-foreground italic">System</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-caption font-mono text-muted-foreground">
                    {item.ipAddress ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-caption text-muted-foreground">
              Showing {logs?.length ?? 0} of {total} events
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
