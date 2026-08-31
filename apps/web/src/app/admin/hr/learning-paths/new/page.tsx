'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Alert, Button, Card, CardContent, FormField, Input } from '@lms/ui';
import { createLearningPath } from '../../../../../lib/learning-paths-client';

export default function NewLearningPathPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [titleError, setTitleError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError(undefined);
    setSubmitting(true);
    try {
      const created = await createLearningPath({ title, description: description || undefined });
      router.push(`/admin/hr/learning-paths/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/admin/hr/learning-paths" className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to learning paths
      </Link>

      <div>
        <h1 className="text-h2 text-foreground">New learning path</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Starts as a draft — add courses and publish once it&apos;s ready.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {formError && <Alert variant="error" title="We couldn't create this learning path">{formError}</Alert>}

            <FormField id="title" label="Title" required error={titleError}>
              <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
            </FormField>

            <FormField id="description" label="Description">
              <textarea
                className="flex w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                rows={3}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/hr/learning-paths')} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create learning path
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
