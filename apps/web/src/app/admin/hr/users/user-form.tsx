'use client';

import * as React from 'react';
import {
  Alert,
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lms/ui';
import {
  ROLE_LABEL,
  ROLE_OPTIONS,
  type DepartmentRecord,
  type RoleKey,
} from '../../../../lib/users-client';

export interface UserFormValues {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentId: string;
  role: RoleKey | '';
  externalId: string;
}

export type UserFormMode = 'create' | 'edit';

interface UserFormProps {
  mode: UserFormMode;
  departments: DepartmentRecord[];
  initial?: Partial<UserFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const NONE = '__none__';

export function UserForm({ mode, departments, initial, submitting, submitLabel, onSubmit, onCancel }: UserFormProps) {
  const [values, setValues] = React.useState<UserFormValues>({
    email: initial?.email ?? '',
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    jobTitle: initial?.jobTitle ?? '',
    departmentId: initial?.departmentId ?? '',
    role: initial?.role ?? '',
    externalId: initial?.externalId ?? '',
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof UserFormValues, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof UserFormValues, string>> = {};
    if (!values.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Enter a valid email address';
    if (!values.firstName.trim()) next.firstName = 'First name is required';
    if (!values.lastName.trim()) next.lastName = 'Last name is required';
    if (mode === 'create' && values.role && !values.externalId.trim()) {
      next.role = 'Assign a role only when an Auth0 subject is known';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      await onSubmit(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <Alert variant="error" title="We couldn't save this user">{formError}</Alert>}

      <FormField id="firstName" label="First name" required error={errors.firstName}>
        <Input value={values.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('firstName', e.target.value)} autoComplete="given-name" />
      </FormField>

      <FormField id="lastName" label="Last name" required error={errors.lastName}>
        <Input value={values.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('lastName', e.target.value)} autoComplete="family-name" />
      </FormField>

      <FormField
        id="email"
        label="Email"
        required
        error={errors.email}
        hint={mode === 'create' ? 'This is where the invitation will be sent.' : undefined}
      >
        <Input
          type="email"
          value={values.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('email', e.target.value)}
          autoComplete="email"
          disabled={mode === 'edit'}
        />
      </FormField>

      <FormField id="jobTitle" label="Job title" error={errors.jobTitle}>
        <Input value={values.jobTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('jobTitle', e.target.value)} />
      </FormField>

      <FormField id="departmentId" label="Department">
        <Select
          value={values.departmentId || NONE}
          onValueChange={(v) => set('departmentId', v === NONE ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="No department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id="role"
        label="Role"
        error={errors.role}
        hint={mode === 'create' ? 'Only assignable if an Auth0 subject is provided below.' : undefined}
      >
        <Select value={values.role || NONE} onValueChange={(v) => set('role', v === NONE ? '' : (v as RoleKey))}>
          <SelectTrigger>
            <SelectValue placeholder="No role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No role</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {mode === 'create' && (
        <FormField
          id="externalId"
          label="Auth0 subject"
          hint="Leave blank to send an invitation; filled in automatically on first login."
        >
          <Input
            value={values.externalId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('externalId', e.target.value)}
            placeholder="auth0|abc123"
          />
        </FormField>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? (mode === 'create' ? 'Send invitation' : 'Save changes')}
        </Button>
      </div>
    </form>
  );
}
