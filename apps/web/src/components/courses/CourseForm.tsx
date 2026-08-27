'use client';

import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lms/ui';
import { X } from 'lucide-react';
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_OPTIONS,
  type CourseDifficulty,
  type CourseVisibility,
  type InstructorRef,
} from '../../lib/courses-client';

export interface CourseFormValues {
  title: string;
  description: string;
  difficulty: CourseDifficulty | '';
  durationMinutes: string;
  learningObjectives: string[];
  visibility: CourseVisibility;
  instructorId: string;
  categories: string[];
}

interface CourseFormProps {
  instructors: InstructorRef[];
  initial?: Partial<CourseFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: CourseFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const NONE = '__none__';

export function CourseForm({ instructors, initial, submitting, submitLabel, onSubmit, onCancel }: CourseFormProps) {
  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [difficulty, setDifficulty] = React.useState<CourseDifficulty | ''>(initial?.difficulty ?? '');
  const [durationMinutes, setDurationMinutes] = React.useState(initial?.durationMinutes ?? '');
  const [visibility, setVisibility] = React.useState<CourseVisibility>(initial?.visibility ?? 'PRIVATE');
  const [instructorId, setInstructorId] = React.useState(initial?.instructorId ?? '');
  const [objectives, setObjectives] = React.useState<string[]>(initial?.learningObjectives ?? []);
  const [objectiveInput, setObjectiveInput] = React.useState('');
  const [categories, setCategories] = React.useState<string[]>(initial?.categories ?? []);
  const [categoryInput, setCategoryInput] = React.useState('');
  const [titleError, setTitleError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | null>(null);

  const addObjective = () => {
    if (objectiveInput.trim()) {
      setObjectives((o) => [...o, objectiveInput.trim()]);
      setObjectiveInput('');
    }
  };
  const addCategory = () => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      setCategories((c) => [...c, categoryInput.trim()]);
      setCategoryInput('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setTitleError('Course title is required');
      return;
    }
    setTitleError(undefined);
    try {
      await onSubmit({
        title,
        description,
        difficulty,
        durationMinutes,
        learningObjectives: objectives,
        visibility,
        instructorId,
        categories,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <Alert variant="error" title="We couldn't save this course">{formError}</Alert>}

      <FormField id="title" label="Title" required error={titleError}>
        <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
      </FormField>

      <FormField id="description" label="Description">
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField id="difficulty" label="Difficulty">
          <Select value={difficulty || NONE} onValueChange={(v) => setDifficulty(v === NONE ? '' : (v as CourseDifficulty))}>
            <SelectTrigger>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {DIFFICULTY_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField id="durationMinutes" label="Duration (minutes)">
          <Input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationMinutes(e.target.value)}
          />
        </FormField>
      </div>

      <FormField id="instructorId" label="Instructor">
        <Select value={instructorId || NONE} onValueChange={(v) => setInstructorId(v === NONE ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {instructors.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.firstName} {i.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField id="visibility" label="Visibility" hint="Public courses appear in the learner catalog once published.">
        <Select value={visibility} onValueChange={(v) => setVisibility(v as CourseVisibility)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private (assignment only)</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField id="objectiveInput" label="Learning objectives">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={objectiveInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObjectiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addObjective();
                }
              }}
              placeholder="e.g. Give effective feedback"
            />
            <Button type="button" variant="secondary" onClick={addObjective}>
              Add
            </Button>
          </div>
          {objectives.length > 0 && (
            <ul className="flex flex-col gap-1">
              {objectives.map((o, i) => (
                <li key={`${o}-${i}`} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-body-sm">
                  {o}
                  <button
                    type="button"
                    onClick={() => setObjectives((list) => list.filter((_, idx) => idx !== i))}
                    aria-label={`Remove objective: ${o}`}
                    className="text-muted-foreground hover:text-error-600"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FormField>

      <FormField id="categoryInput" label="Categories">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={categoryInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="e.g. Leadership"
            />
            <Button type="button" variant="secondary" onClick={addCategory}>
              Add
            </Button>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c} variant="outline" className="gap-1.5">
                  {c}
                  <button
                    type="button"
                    onClick={() => setCategories((list) => list.filter((x) => x !== c))}
                    aria-label={`Remove category: ${c}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </FormField>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? 'Save course'}
        </Button>
      </div>
    </form>
  );
}
