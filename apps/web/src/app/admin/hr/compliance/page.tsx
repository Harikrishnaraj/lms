'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ErrorState, FullPageLoader } from '@lms/ui';
import { listDepartments, type DepartmentRecord } from '../../../../lib/departments-client';
import { listTeamEnrollments } from '../../../../lib/manager-client';

interface DepartmentCompliance {
  department: DepartmentRecord;
  totalMembers: number;
  completedMandatory: number;
  totalMandatory: number;
  complianceRate: number;
}

export default function AdminHrCompliancePage() {
  const [compliance, setCompliance] = React.useState<DepartmentCompliance[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const depts = await listDepartments();
      const enrolls = await listTeamEnrollments({ pageSize: 200 });

      const deptCompliance = depts.map((d) => {
        // Find all mandatory enrollments in this department
        // Note: In real API, we filter by departmentId in query; here we mock
        const mandatoryEnrolls = enrolls.items.filter((e) => e.isMandatory);
        const completed = mandatoryEnrolls.filter((e) => e.status === 'COMPLETED').length;
        const total = mandatoryEnrolls.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

        return {
          department: d,
          totalMembers: d.userCount,
          completedMandatory: completed,
          totalMandatory: total,
          complianceRate: rate,
        };
      });

      setCompliance(deptCompliance);
    } catch {
      setError('Failed to load compliance data.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!compliance) return <FullPageLoader label="Loading compliance tracking" />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Compliance Tracker</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Monitor mandatory training completion rates across all departments.
        </p>
      </header>

      {/* Compliance Table */}
      <div className="rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Members</th>
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Mandatory Courses</th>
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Completed</th>
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Compliance Rate</th>
              <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((item) => (
              <tr
                key={item.department.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-hover"
              >
                <td className="px-4 py-3 text-body-sm font-medium text-foreground">
                  {item.department.name}
                </td>
                <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                  {item.totalMembers}
                </td>
                <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                  {item.totalMandatory}
                </td>
                <td className="px-4 py-3 text-center text-body-sm tabular-nums text-foreground">
                  {item.completedMandatory}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 bg-border h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.complianceRate >= 90
                            ? 'bg-green-500'
                            : item.complianceRate >= 70
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${item.complianceRate}%` }}
                      />
                    </div>
                    <span className="text-body-sm font-semibold tabular-nums text-foreground">
                      {item.complianceRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {item.complianceRate >= 90 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                      <CheckCircle className="size-3.5" />
                      Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                      <AlertCircle className="size-3.5" />
                      Attention Required
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
