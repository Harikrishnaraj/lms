'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Save, Trash2 } from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import {
  getAssessmentForAuthor,
  updateAssessment,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  type AssessmentForAuthor,
  type AuthorQuestion,
} from '../../../../lib/trainer-assessments-client';

interface QuestionFormState {
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}

const emptyQuestion: QuestionFormState = { text: '', options: ['', ''], correctIndex: 0, points: 1 };

export default function TrainerAssessmentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [assessment, setAssessment] = React.useState<AssessmentForAuthor | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Assessment meta editing
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [passingScore, setPassingScore] = React.useState(70);
  const [attemptLimit, setAttemptLimit] = React.useState<number | null>(null);

  // New question form
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newQ, setNewQ] = React.useState<QuestionFormState>({ ...emptyQuestion });
  const [addingQ, setAddingQ] = React.useState(false);

  // Edit question form
  const [editingQId, setEditingQId] = React.useState<string | null>(null);
  const [editQ, setEditQ] = React.useState<QuestionFormState>({ ...emptyQuestion });

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await getAssessmentForAuthor(id);
      setAssessment(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setPassingScore(data.passingScore);
      setAttemptLimit(data.attemptLimit);
    } catch {
      setError('Failed to load assessment.');
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      const updated = await updateAssessment(id, { title, description, passingScore, attemptLimit });
      setAssessment(updated);
    } catch {
      alert('Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQ.text.trim() || newQ.options.some((o) => !o.trim())) return;
    setAddingQ(true);
    try {
      const created = await addQuestion(id, newQ);
      setAssessment((prev) => prev ? { ...prev, questions: [...prev.questions, created] } : prev);
      setNewQ({ ...emptyQuestion });
      setShowNewForm(false);
    } catch {
      alert('Failed to add question.');
    } finally {
      setAddingQ(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string) => {
    if (!editQ.text.trim() || editQ.options.some((o) => !o.trim())) return;
    try {
      const updated = await updateQuestion(id, questionId, editQ);
      setAssessment((prev) =>
        prev
          ? { ...prev, questions: prev.questions.map((q) => (q.id === questionId ? updated : q)) }
          : prev,
      );
      setEditingQId(null);
    } catch {
      alert('Failed to update question.');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await deleteQuestion(id, questionId);
      setAssessment((prev) =>
        prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) } : prev,
      );
    } catch {
      alert('Failed to delete question.');
    }
  };

  const startEditing = (q: AuthorQuestion) => {
    setEditingQId(q.id);
    setEditQ({ text: q.text, options: [...q.options], correctIndex: q.correctIndex, points: q.points });
  };

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!assessment) return <FullPageLoader label="Loading assessment" />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link href="/trainer/assessments" className="rounded-lg p-2 transition-colors hover:bg-hover">
          <ArrowLeft className="size-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-h2 text-foreground">Edit Assessment</h1>
          {assessment.courseRef && (
            <p className="text-body-sm text-muted-foreground">
              Course: {assessment.courseRef.title}
            </p>
          )}
        </div>
      </header>

      {/* Meta Form */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-h4 text-foreground mb-4">Assessment Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Passing Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Attempt Limit (blank = unlimited)</label>
            <input
              type="number"
              min={1}
              value={attemptLimit ?? ''}
              onChange={(e) => setAttemptLimit(e.target.value ? Number(e.target.value) : null)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Unlimited"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void handleSaveMeta()} disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h4 text-foreground">
            Questions ({assessment.questions.length})
          </h2>
          {!showNewForm && (
            <Button onClick={() => setShowNewForm(true)} variant="outline" size="sm">
              <Plus className="size-4" />
              Add question
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {assessment.questions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border border-border p-4">
              {editingQId === q.id ? (
                <QuestionForm
                  state={editQ}
                  setState={setEditQ}
                  onSave={() => void handleUpdateQuestion(q.id)}
                  onCancel={() => setEditingQId(null)}
                  saveLabel="Update"
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-foreground">
                      Q{idx + 1}. {q.text}
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-body-sm ${
                            i === q.correctIndex
                              ? 'bg-green-500/10 text-green-700 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {i === q.correctIndex && <Check className="size-3.5" />}
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-caption text-muted-foreground">{q.points} point{q.points !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(q)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                      title="Edit"
                    >
                      <Save className="size-4" />
                    </button>
                    <button
                      onClick={() => void handleDeleteQuestion(q.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New Question Form */}
          {showNewForm && (
            <div className="rounded-lg border-2 border-dashed border-primary/30 p-4">
              <QuestionForm
                state={newQ}
                setState={setNewQ}
                onSave={() => void handleAddQuestion()}
                onCancel={() => {
                  setShowNewForm(false);
                  setNewQ({ ...emptyQuestion });
                }}
                saveLabel={addingQ ? 'Adding…' : 'Add Question'}
                disabled={addingQ}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionForm({
  state,
  setState,
  onSave,
  onCancel,
  saveLabel,
  disabled,
}: {
  state: QuestionFormState;
  setState: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  disabled?: boolean;
}) {
  const addOption = () => setState((s) => ({ ...s, options: [...s.options, ''] }));
  const removeOption = (idx: number) =>
    setState((s) => ({
      ...s,
      options: s.options.filter((_, i) => i !== idx),
      correctIndex: s.correctIndex >= s.options.length - 1 ? 0 : s.correctIndex,
    }));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Question text"
        value={state.text}
        onChange={(e) => setState((s) => ({ ...s, text: e.target.value }))}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex flex-col gap-2">
        {state.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              checked={state.correctIndex === i}
              onChange={() => setState((s) => ({ ...s, correctIndex: i }))}
              className="accent-primary"
              title={`Mark option ${i + 1} as correct`}
            />
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  options: s.options.map((o, j) => (j === i ? e.target.value : o)),
                }))
              }
              className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-body-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {state.options.length > 2 && (
              <button onClick={() => removeOption(i)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        <button onClick={addOption} className="text-body-sm text-primary hover:underline self-start">
          + Add option
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-caption text-muted-foreground">Points:</label>
          <input
            type="number"
            min={1}
            value={state.points}
            onChange={(e) => setState((s) => ({ ...s, points: Number(e.target.value) || 1 }))}
            className="h-8 w-16 rounded border border-border bg-surface px-2 text-body-sm text-foreground"
          />
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={disabled}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
