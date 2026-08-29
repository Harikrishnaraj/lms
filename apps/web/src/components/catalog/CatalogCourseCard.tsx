'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, CourseCard } from '@lms/ui';
import {
  DIFFICULTY_LABEL,
  ENROLLMENT_STATUS_LABEL,
  type CatalogCourse,
} from '../../lib/catalog-client';

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function statusBadgeVariant(status: CatalogCourse['enrollmentStatus']): 'default' | 'primary' | 'success' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS' || status === 'NOT_STARTED') return 'primary';
  return 'default';
}

export interface CatalogCourseCardProps {
  course: CatalogCourse;
  onEnroll: (courseId: string) => void;
  enrolling: boolean;
}

export function CatalogCourseCard({ course, onEnroll, enrolling }: CatalogCourseCardProps) {
  const duration = formatDuration(course.durationMinutes);
  const isEnrolled = course.enrollmentStatus !== 'NOT_ENROLLED';

  return (
    <CourseCard
      title={course.title}
      subtitle={course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : undefined}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-sm text-muted-foreground">{duration ?? '—'}</span>
          {isEnrolled ? (
            <Link href={`/learner/catalog/${course.id}`}>
              <Button variant="secondary" size="sm">
                View
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => onEnroll(course.id)} disabled={enrolling}>
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {course.difficulty && <Badge variant="outline">{DIFFICULTY_LABEL[course.difficulty]}</Badge>}
        {course.isMandatory && <Badge variant="warning">Mandatory</Badge>}
        {isEnrolled && (
          <Badge variant={statusBadgeVariant(course.enrollmentStatus)}>
            {ENROLLMENT_STATUS_LABEL[course.enrollmentStatus]}
          </Badge>
        )}
      </div>
      {course.description && (
        <p className="line-clamp-2 text-body-sm text-muted-foreground">{course.description}</p>
      )}
    </CourseCard>
  );
}
