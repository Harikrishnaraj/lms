'use client';

import Link from 'next/link';
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@lms/ui';
import { STATUS_LABEL, type CourseRecord, type CourseStatus } from '../../lib/courses-client';

export function CourseTable({ courses, detailHref }: { courses: CourseRecord[]; detailHref: (id: string) => string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Instructor</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell>
              <Link href={detailHref(course.id)} className="font-medium text-foreground hover:text-primary hover:underline">
                {course.title}
              </Link>
            </TableCell>
            <TableCell>
              {course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>{course.difficulty ?? <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell>
              <StatusBadge status={course.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: CourseStatus }) {
  if (status === 'PUBLISHED') return <Badge variant="success">{STATUS_LABEL[status]}</Badge>;
  if (status === 'ARCHIVED') return <Badge variant="outline">{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="warning">{STATUS_LABEL[status]}</Badge>;
}
