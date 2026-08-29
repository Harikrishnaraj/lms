'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Button, FormField, Input } from '@lms/ui';
import { ApiError } from '../../lib/api-client';
import { signup } from '../../lib/auth-client';

export default function SignupPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signup(email, password, name);
      setSuccessMessage(result.message);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with that email already exists.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message || 'Please check your details and try again.');
      } else {
        setError('Something went wrong creating your account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6 text-center">
        <Alert variant="success" title="Account created">
          {successMessage}
        </Alert>
        <Link href="/login" className="text-body-sm font-medium text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-h2 text-foreground">Create an account</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Your organization&apos;s administrator still needs to add you before you can access anything.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Couldn't create account">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField id="name" label="Full name" required>
          <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField id="email" label="Email" required>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField id="password" label="Password" required hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-body-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
