'use client';

import * as React from 'react';
import { Alert, Button, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lms/ui';
import type { ManagerRef } from '../../../../lib/departments-client';

export interface DepartmentFormValues {
  name: string;
  managerId: string;
}

interface DepartmentFormProps {
  managers: ManagerRef[];
  initial?: Partial<DepartmentFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: DepartmentFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const NONE = '__none__';

export function DepartmentForm({ managers, initial, submitting, submitLabel, onSubmit, onCancel }: DepartmentFormProps) {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [managerId, setManagerId] = React.useState(initial?.managerId ?? '');
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setNameError('Department name is required');
      return;
    }
    setNameError(undefined);
    try {
      await onSubmit({ name, managerId });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <Alert variant="error" title="We couldn't save this department">{formError}</Alert>}

      <FormField id="name" label="Department name" required error={nameError}>
        <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
      </FormField>

      <FormField id="managerId" label="Manager" hint="Anyone in the organization can be set as manager.">
        <Select value={managerId || NONE} onValueChange={(v) => setManagerId(v === NONE ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="No manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No manager</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? 'Save department'}
        </Button>
      </div>
    </form>
  );
}
