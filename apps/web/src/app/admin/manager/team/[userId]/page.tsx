'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle, Clock, Trophy } from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { getUser, type UserRecord } from '../../../../../lib/users-client';
import { listTeamEnrollments } from '../../../../../lib/manager-client';
import { EnrollmentRecord, STATUS_LABEL } from '../../../../../lib/enrollments-client';
import { listCertificates, type CertificateView } from '../../../../../lib/certificates-client';

export default function EmployeeDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = React.useState<UserRecord | null>(null);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRecord[] | null>(null);
  const [certificates, setCertificates] = React.useState<CertificateView[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [u, enrolls] = await Promise.all([
        getUser(userId),
        listTeamEnrollments({ pageSize: 100 }), // The backend scopes results for this manager automatically
      ]);
      setUser(u);
      setEnrollments(enrolls.items); // The backend already scopes this to the manager's team

      try {
        const certs = await listCertificates();
        setCertificates(certs);
      } catch {
        setCertificates([]);
      }
    } catch {
      setError('Failed to load employee details.');
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!user || !enrollments || !certificates) return <FullPageLoader label="Loading employee progress" />;

  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const inProgress = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
  const notStarted = enrollments.filter((e) => e.status === 'NOT_STARTED').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/manager/team">
            <ArrowLeft className="size-4 mr-1.5" />
            Back to team
          </Link>
        </Button>
      </header>

      {/* Employee Info Card */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-h2 text-foreground">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-body-md text-muted-foreground">{user.email}</p>
            {user.jobTitle && (
              <p className="mt-1 text-body-sm text-muted-foreground font-medium">
                {user.jobTitle} · {user.department?.name ?? 'No Department'}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Completed</p>
              <p className="text-h4 text-green-600 font-semibold">{completed}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">In Progress</p>
              <p className="text-h4 text-amber-500 font-semibold">{inProgress}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Not Started</p>
              <p className="text-h4 text-muted-foreground font-semibold">{notStarted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollments & Progress */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Enrollments List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-h4 text-foreground mb-4">Course Progress</h2>
          {enrollments.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">
              Not enrolled in any courses yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {enrollments.map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-body-md font-semibold text-foreground">
                        {e.course.title}
                      </h3>
                      <p className="text-caption text-muted-foreground mt-1">
                        Assigned via {e.source} · {e.isMandatory ? 'Mandatory' : 'Optional'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === 'COMPLETED'
                          ? 'bg-green-500/10 text-green-600'
                          : e.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-gray-500/10 text-gray-600'
                      }`}
                    >
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-caption text-muted-foreground border-t border-border pt-3">
                    {e.dueDate && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Due: {new Date(e.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {e.startedAt && (
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5" />
                        Started: {new Date(e.startedAt).toLocaleDateString()}
                      </span>
                    )}
                    {e.completedAt && (
                      <span className="flex items-center gap-1.5 text-green-600 font-medium">
                        <CheckCircle className="size-3.5" />
                        Completed: {new Date(e.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certificates */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-h4 text-foreground mb-4">Earned Certificates</h2>
          {certificates.length === 0 ? (
            <div className="py-8 text-center text-body-md text-muted-foreground">
              <Trophy className="size-8 mx-auto mb-2 text-muted-foreground/40" />
              No certificates earned yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {certificates.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-4 bg-primary/[0.02]">
                  <Trophy className="size-5 text-amber-500 mb-1" />
                  <h3 className="text-body-sm font-semibold text-foreground">
                    {c.course?.title ?? 'Course Certificate'}
                  </h3>
                  <p className="text-caption text-muted-foreground mt-1">
                    No. {c.certificateNumber}
                  </p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Issued: {new Date(c.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
