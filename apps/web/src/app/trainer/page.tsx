'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { listCourses, type CourseRecord } from '../../lib/courses-client';
import { listAssessments, type AssessmentListItem } from '../../lib/trainer-assessments-client';

interface DashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalAssessments: number;
  totalAttempts: number;
}

function computeStats(
  courses: CourseRecord[],
  assessments: AssessmentListItem[],
): DashboardStats {
  return {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c.status === 'PUBLISHED').length,
    draftCourses: courses.filter((c) => c.status === 'DRAFT').length,
    totalAssessments: assessments.length,
    totalAttempts: assessments.reduce((sum, a) => sum + a._count.attempts, 0),
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card group relative overflow-hidden rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg">
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

export default function TrainerDashboardPage() {
  const [courses, setCourses] = React.useState<CourseRecord[] | null>(null);
  const [assessments, setAssessments] = React.useState<AssessmentListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setCourses(null);
    setAssessments(null);
    try {
      const [courseData, assessmentData] = await Promise.all([
        listCourses({ pageSize: 200 }),
        listAssessments({ pageSize: 200 }),
      ]);
      setCourses(courseData.items);
      setAssessments(assessmentData.items);
    } catch {
      setError('Failed to load trainer dashboard data.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!courses || !assessments) return <FullPageLoader label="Loading dashboard" />;

  const stats = computeStats(courses, assessments);

  const recentAssessments = assessments
    .filter((a) => a._count.attempts > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-h2 text-foreground">Trainer Dashboard</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            Manage courses, assessments, and track learner progress.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/trainer/assessments">
              <ClipboardList className="size-4" aria-hidden="true" />
              Assessments
            </Link>
          </Button>
          <Button asChild>
            <Link href="/trainer/courses/new">
              <Plus className="size-4" aria-hidden="true" />
              New course
            </Link>
          </Button>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} accent="#6366f1" />
        <StatCard icon={TrendingUp} label="Published" value={stats.publishedCourses} accent="#10b981" />
        <StatCard icon={BookOpen} label="Drafts" value={stats.draftCourses} accent="#f59e0b" />
        <StatCard icon={ClipboardList} label="Assessments" value={stats.totalAssessments} accent="#8b5cf6" />
        <StatCard icon={Users} label="Submissions" value={stats.totalAttempts} accent="#ec4899" />
      </div>

      {/* Quick Actions + Recent Assessments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-h4 text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/trainer/courses/new"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-hover"
            >
              <Plus className="size-5 text-primary" />
              <div>
                <p className="text-body-md font-medium text-foreground">Create New Course</p>
                <p className="text-caption text-muted-foreground">Start building a course for your learners</p>
              </div>
            </Link>
            <Link
              href="/trainer/assessments"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-hover"
            >
              <ClipboardList className="size-5 text-primary" />
              <div>
                <p className="text-body-md font-medium text-foreground">Manage Assessments</p>
                <p className="text-caption text-muted-foreground">Create quizzes and review learner submissions</p>
              </div>
            </Link>
            <Link
              href="/trainer/submissions"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-hover"
            >
              <GraduationCap className="size-5 text-primary" />
              <div>
                <p className="text-body-md font-medium text-foreground">Review Submissions</p>
                <p className="text-caption text-muted-foreground">View and grade learner quiz attempts</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Assessments with Submissions */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h4 text-foreground">Recent Assessment Activity</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/trainer/submissions">View all</Link>
            </Button>
          </div>
          {recentAssessments.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">
              No submissions yet. Create an assessment to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentAssessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/trainer/assessments/${assessment.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-foreground">
                      {assessment.title}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {assessment._count.questions} questions ·{' '}
                      {assessment.contentItem?.module.course.title ?? 'Standalone'}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {assessment._count.attempts} submissions
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Courses */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h4 text-foreground">My Courses</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/trainer/courses">View all</Link>
          </Button>
        </div>
        {courses.length === 0 ? (
          <p className="text-body-md text-muted-foreground py-8 text-center">
            No courses yet. Create your first course to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course) => (
              <Link
                key={course.id}
                href={`/trainer/courses/${course.id}`}
                className="group rounded-lg border border-border p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      course.status === 'PUBLISHED'
                        ? 'bg-green-500/10 text-green-600'
                        : course.status === 'DRAFT'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    {course.status}
                  </span>
                  {course.difficulty && (
                    <span className="text-xs text-muted-foreground">{course.difficulty}</span>
                  )}
                </div>
                <h3 className="truncate text-body-md font-medium text-foreground group-hover:text-primary">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">
                    {course.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
