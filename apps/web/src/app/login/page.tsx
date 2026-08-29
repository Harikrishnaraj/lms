'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, FormField, Input } from '@lms/ui';
import { ApiError } from '../../lib/api-client';
import { getMe, login } from '../../lib/auth-client';

const LANDING_BY_ROLE: Record<string, string> = {
  LEARNER: '/learner',
  TRAINER: '/trainer',
  MANAGER: '/admin/manager',
  HR_LD_ADMIN: '/admin/hr',
  ORGANIZATION_ADMIN: '/admin/organization',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [unlinkedWarning, setUnlinkedWarning] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnlinkedWarning(false);
    setSubmitting(true);
    try {
      await login(email, password);
      const me = await getMe();
      if (!me.organizationId) {
        // A successful Auth0 login doesn't guarantee the tenant's
        // post-login Action is wired up yet — see auth-client.ts. Surface
        // this plainly instead of silently redirecting into a portal that
        // will fail every request.
        setUnlinkedWarning(true);
        return;
      }
      router.push(me.role ? (LANDING_BY_ROLE[me.role] ?? '/') : '/');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setError('That email and password don\'t match an account.');
      } else {
        setError('Something went wrong signing you in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-h2 text-foreground">Sign in</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">Welcome back to the LMS.</p>
      </div>

      {unlinkedWarning && (
        <Alert variant="warning" title="Signed in, but not linked to an organization">
          Your account authenticated successfully, but it isn&apos;t associated with an organization yet. Ask an
          administrator to finish the Auth0 setup (see <code>apps/api/src/auth/README.md</code>), then sign in
          again. <Link href="/" className="underline">Back to home</Link>
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Couldn't sign in">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField id="email" label="Email" required>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField id="password" label="Password" required>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-body-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-body-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
