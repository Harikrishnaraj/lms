'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronUp, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  ErrorState,
  FormField,
  FullPageLoader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lms/ui';
import { isNotFound } from '../../../../../lib/api-client';
import { listAllCoursesForPicker, type CourseOption } from '../../../../../lib/courses-admin-client';
import {
  addLearningPathCourse,
  getLearningPathAdmin,
  LEARNING_PATH_STATUS_LABEL,
  removeLearningPathCourse,
  reorderLearningPathCourses,
  setLearningPathStatus,
  type LearningPath,
  type LearningPathStatus,
} from '../../../../../lib/learning-paths-client';

type LoadState = 'loading' | 'error' | 'not-found' | 'ready';

function statusBadgeVariant(status: LearningPathStatus): 'default' | 'success' | 'outline' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'ARCHIVED') return 'outline';
  return 'default';
}

export default function AdminLearningPathDetailPage() {
  const params = useParams<{ id: string }>();
  const [path, setPath] = React.useState<LearningPath | null>(null);
  const [allCourses, setAllCourses] = React.useState<CourseOption[] | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pickerCourseId, setPickerCourseId] = React.useState('');
  const [pickerRequired, setPickerRequired] = React.useState(true);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const [p, courses] = await Promise.all([getLearningPathAdmin(params.id), listAllCoursesForPicker()]);
      setPath(p);
      setAllCourses(courses);
      setState('ready');
    } catch (err) {
      setState(isNotFound(err) ? 'not-found' : 'error');
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = React.useCallback(
    async (action: () => Promise<LearningPath>) => {
      setBusy(true);
      setActionError(null);
      try {
        const updated = await action();
        setPath(updated);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (state === 'not-found') return <ErrorState title="Learning path not found" />;
  if (state === 'error') return <ErrorState onRetry={() => void load()} />;
  if (state === 'loading' || !path || !allCourses) return <FullPageLoader label="Loading learning path" />;

  const availableCourses = allCourses.filter((c) => !path.courses.some((pc) => pc.courseId === c.id));
  const sortedCourses = path.courses.slice().sort((a, b) => a.position - b.position);

  const moveCourse = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedCourses.length) return;
    const reordered = sortedCourses.map((c) => c.courseId);
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    void runAction(() => reorderLearningPathCourses(path.id, reordered));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin/hr/learning-paths" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to learning paths
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h2 text-foreground">{path.title}</h1>
            <Badge variant={statusBadgeVariant(path.status)}>{LEARNING_PATH_STATUS_LABEL[path.status]}</Badge>
          </div>
          {path.description && <p className="mt-1 text-body-md text-muted-foreground">{path.description}</p>}
        </div>
        <div className="flex gap-2">
          {path.status === 'DRAFT' && (
            <Button disabled={busy} onClick={() => void runAction(() => setLearningPathStatus(path.id, 'PUBLISHED'))}>
              Publish
            </Button>
          )}
          {path.status === 'PUBLISHED' && (
            <Button variant="secondary" disabled={busy} onClick={() => void runAction(() => setLearningPathStatus(path.id, 'ARCHIVED'))}>
              Archive
            </Button>
          )}
          {path.status === 'ARCHIVED' && (
            <Button variant="secondary" disabled={busy} onClick={() => void runAction(() => setLearningPathStatus(path.id, 'DRAFT'))}>
              Move back to draft
            </Button>
          )}
        </div>
      </header>

      {actionError && <Alert variant="error" title="That didn't work">{actionError}</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <h2 className="text-label-lg text-foreground">Courses in this path</h2>
          {sortedCourses.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No courses yet — add one below.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedCourses.map((course, index) => (
                <div key={course.courseId} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="sm" className="h-5 p-0" disabled={busy || index === 0} onClick={() => moveCourse(index, -1)} aria-label="Move up">
                      <ChevronUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 p-0" disabled={busy || index === sortedCourses.length - 1} onClick={() => moveCourse(index, 1)} aria-label="Move down">
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-body-md font-medium text-foreground">{course.course.title}</span>
                    <span className="text-body-sm text-muted-foreground">{course.course.status}</span>
                  </div>
                  <Badge variant={course.isRequired ? 'outline' : 'default'}>{course.isRequired ? 'Required' : 'Optional'}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void runAction(() => removeLearningPathCourse(path.id, course.courseId))}
                    aria-label="Remove course"
                  >
                    <Trash2 className="size-4 text-error-500" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <FormField id="course-picker" label="Add a course" className="min-w-[240px] flex-1">
              <Select value={pickerCourseId} onValueChange={setPickerCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={availableCourses.length === 0 ? 'No more courses to add' : 'Choose a course'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="course-required" label="Required?">
              <Select value={pickerRequired ? 'required' : 'optional'} onValueChange={(v) => setPickerRequired(v === 'required')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <Button
              disabled={busy || !pickerCourseId}
              onClick={() =>
                void runAction(async () => {
                  const updated = await addLearningPathCourse(path.id, { courseId: pickerCourseId, isRequired: pickerRequired });
                  setPickerCourseId('');
                  return updated;
                })
              }
            >
              Add course
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
