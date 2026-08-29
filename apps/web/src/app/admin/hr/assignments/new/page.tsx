'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Alert, Button, Card, CardContent, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lms/ui';
import { createAssignment, type AssignmentScopeType, type AssignmentTargetType } from '../../../../../lib/assignments-client';
import { listAllCoursesForPicker, type CourseOption } from '../../../../../lib/courses-admin-client';
import { listLearningPathCatalog, type LearningPathWithProgress } from '../../../../../lib/learning-paths-client';
import { listDepartmentsForPicker, listUsersForPicker, type DepartmentOption, type UserOption } from '../../../../../lib/org-directory-client';

export default function NewAssignmentPage() {
  const router = useRouter();
  const [targetType, setTargetType] = React.useState<AssignmentTargetType>('COURSE');
  const [scopeType, setScopeType] = React.useState<AssignmentScopeType>('USER');
  const [courseId, setCourseId] = React.useState('');
  const [learningPathId, setLearningPathId] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');
  const [isMandatory, setIsMandatory] = React.useState(false);
  const [dueDate, setDueDate] = React.useState('');

  const [courses, setCourses] = React.useState<CourseOption[] | null>(null);
  const [paths, setPaths] = React.useState<LearningPathWithProgress[] | null>(null);
  const [users, setUsers] = React.useState<UserOption[] | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentOption[] | null>(null);

  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    listAllCoursesForPicker().then((all) => setCourses(all.filter((c) => c.status === 'PUBLISHED'))).catch(() => setCourses([]));
    listLearningPathCatalog({ pageSize: 100 }).then((res) => setPaths(res.items)).catch(() => setPaths([]));
    listUsersForPicker().then(setUsers).catch(() => setUsers([]));
    listDepartmentsForPicker().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (targetType === 'COURSE' && !courseId) return setFormError('Choose a course');
    if (targetType === 'LEARNING_PATH' && !learningPathId) return setFormError('Choose a learning path');
    if (scopeType === 'USER' && !userId) return setFormError('Choose a user');
    if (scopeType === 'DEPARTMENT' && !departmentId) return setFormError('Choose a department');

    setSubmitting(true);
    try {
      const created = await createAssignment({
        targetType,
        courseId: targetType === 'COURSE' ? courseId : undefined,
        learningPathId: targetType === 'LEARNING_PATH' ? learningPathId : undefined,
        scopeType,
        userId: scopeType === 'USER' ? userId : undefined,
        departmentId: scopeType === 'DEPARTMENT' ? departmentId : undefined,
        isMandatory,
        dueDate: dueDate || undefined,
      });
      router.push(`/admin/hr/assignments/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadingPickers = !courses || !paths || !users || !departments;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/admin/hr/assignments" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to assignments
      </Link>

      <div>
        <h1 className="text-h2 text-foreground">New assignment</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Assign a course or learning path to one person or a whole department.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {formError && <Alert variant="error" title="We couldn't create this assignment">{formError}</Alert>}

            <FormField id="targetType" label="What to assign">
              <Select value={targetType} onValueChange={(v) => setTargetType(v as AssignmentTargetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COURSE">A course</SelectItem>
                  <SelectItem value="LEARNING_PATH">A learning path</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {targetType === 'COURSE' ? (
              <FormField id="courseId" label="Course" required hint="Only published courses can be assigned.">
                <Select value={courseId} onValueChange={setCourseId} disabled={loadingPickers}>
                  <SelectTrigger>
                    <SelectValue placeholder={courses?.length === 0 ? 'No published courses' : 'Choose a course'} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <FormField id="learningPathId" label="Learning path" required hint="Only published paths can be assigned.">
                <Select value={learningPathId} onValueChange={setLearningPathId} disabled={loadingPickers}>
                  <SelectTrigger>
                    <SelectValue placeholder={paths?.length === 0 ? 'No published paths' : 'Choose a learning path'} />
                  </SelectTrigger>
                  <SelectContent>
                    {paths?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <FormField id="scopeType" label="Assign to">
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as AssignmentScopeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">One person</SelectItem>
                  <SelectItem value="DEPARTMENT">A whole department</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {scopeType === 'USER' ? (
              <FormField id="userId" label="Person" required>
                <Select value={userId} onValueChange={setUserId} disabled={loadingPickers}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <FormField id="departmentId" label="Department" required hint="Every active member of the department will be assigned.">
                <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingPickers}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <div className="flex items-center gap-2">
              <input
                id="isMandatory"
                type="checkbox"
                className="size-4 rounded border-gray-300 text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
              />
              <label htmlFor="isMandatory" className="text-body-sm text-foreground">Mandatory</label>
            </div>

            <FormField id="dueDate" label="Due date">
              <Input type="date" value={dueDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)} />
            </FormField>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/hr/assignments')} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={loadingPickers}>
                Create assignment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
