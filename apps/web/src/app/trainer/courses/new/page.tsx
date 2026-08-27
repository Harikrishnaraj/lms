'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, FullPageLoader } from '@lms/ui';
import { CourseForm } from '../../../../components/courses/CourseForm';
import { createCourse, currentTrainerId, listInstructors, type InstructorRef } from '../../../../lib/courses-client';

export default function NewCoursePage() {
  const router = useRouter();
  const [instructors, setInstructors] = React.useState<InstructorRef[] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    listInstructors().then(setInstructors).catch(() => setInstructors([]));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/trainer/courses" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to my courses
      </Link>

      <div>
        <h1 className="text-h2 text-foreground">New course</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Starts as a draft — publish when it&apos;s ready for learners.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {!instructors ? (
            <FullPageLoader label="Loading form" />
          ) : (
            <CourseForm
              instructors={instructors}
              initial={{ instructorId: currentTrainerId() }}
              submitting={submitting}
              submitLabel="Create course"
              onCancel={() => router.push('/trainer/courses')}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  const created = await createCourse({
                    title: values.title,
                    description: values.description || undefined,
                    difficulty: values.difficulty || undefined,
                    durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
                    learningObjectives: values.learningObjectives,
                    visibility: values.visibility,
                    instructorId: values.instructorId || undefined,
                    categories: values.categories,
                  });
                  router.push(`/trainer/courses/${created.id}`);
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
