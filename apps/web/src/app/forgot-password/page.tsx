'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Button, FormField, Input } from '@lms/ui';
import { forgotPassword } from '../../lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch {
      // The endpoint always returns a generic success message regardless
      // of whether the email is registered — a thrown error here means the
      // request itself failed (network, validation), not "email not found".
      setMessage('Something went wrong sending that email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-h2 text-foreground">Reset your password</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          We&apos;ll email you a link to reset your password if an account exists.
        </p>
      </div>

      {message ? (
        <Alert variant="info">{message}</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField id="email" label="Email" required>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="text-center text-body-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
