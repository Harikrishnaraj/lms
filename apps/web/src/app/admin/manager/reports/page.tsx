'use client';

import * as React from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { listTeamEnrollments } from '../../../../lib/manager-client';
import { EnrollmentRecord } from '../../../../lib/enrollments-client';

export default function ManagerReportsPage() {
  const [enrollments, setEnrollments] = React.useState<EnrollmentRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await listTeamEnrollments({ pageSize: 200 });
      setEnrollments(data.items);
    } catch {
      setError('Failed to load team report data.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!enrollments) return <FullPageLoader label="Generating report" />;

  const total = enrollments.length;
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const mandatory = enrollments.filter((e) => e.isMandatory).length;
  const mandatoryCompleted = enrollments.filter((e) => e.isMandatory && e.status === 'COMPLETED').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end print:hidden">
        <div>
          <h1 className="text-h2 text-foreground">Team Reports</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Compliance and training progression reports for your departments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="size-4 mr-1.5" />
            Print Report
          </Button>
          <Button variant="outline" onClick={() => alert('CSV download starting…')}>
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* Printable Report Container */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-6 print:border-0 print:p-0">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <FileText className="size-6 text-primary" />
          <div>
            <h2 className="text-h4 text-foreground">Department Training Compliance Summary</h2>
            <p className="text-caption text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption text-muted-foreground">Total Enrollments</p>
            <p className="text-h3 font-semibold text-foreground">{total}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption text-muted-foreground">Completed Courses</p>
            <p className="text-h3 font-semibold text-green-600">{completed}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption text-muted-foreground">Mandatory Courses</p>
            <p className="text-h3 font-semibold text-foreground">{mandatory}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption text-muted-foreground">Mandatory Compliance</p>
            <p className="text-h3 font-semibold text-primary">
              {mandatory > 0 ? `${Math.round((mandatoryCompleted / mandatory) * 100)}%` : '100%'}
            </p>
          </div>
        </div>

        {/* Table representation */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-left">
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Course</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Type</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 text-caption font-semibold text-muted-foreground">Completion Date</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-body-sm font-medium text-foreground">{e.course.title}</td>
                  <td className="px-4 py-3 text-center text-body-sm text-muted-foreground">
                    {e.isMandatory ? 'Mandatory' : 'Optional'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-body-sm text-foreground">{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">
                    {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
