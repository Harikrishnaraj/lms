'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import { isNotFound } from '../../lib/api-client';
import { listDevUsers, signInAsDevUser, type DevUser } from '../../lib/dev-auth-client';

const LANDING_BY_ROLE: Record<string, string> = {
  LEARNER: '/learner/catalog',
  TRAINER: '/trainer',
  MANAGER: '/admin/manager',
  HR_LD_ADMIN: '/admin/hr',
  ORGANIZATION_ADMIN: '/admin/organization',
};

type LoadState = 'loading' | 'disabled' | 'error' | 'ready';

/**
 * Local-only "sign in as a seeded demo user" — see
 * apps/api/src/auth/README.md ("Local dev without Auth0"). Never a
 * production surface: the API 404s every /auth/dev/* route unless
 * DEV_AUTH_BYPASS=true, which this page treats as "not set up yet" rather
 * than an error.
 */
export default function DevLoginPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<DevUser[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [signingInAs, setSigningInAs] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const result = await listDevUsers();
      setUsers(result);
      setState('ready');
    } catch (err) {
      setState(isNotFound(err) ? 'disabled' : 'error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSignIn = React.useCallback(
    async (user: DevUser) => {
      setSigningInAs(user.userId);
      try {
        await signInAsDevUser(user.userId);
        router.push(user.role ? (LANDING_BY_ROLE[user.role] ?? '/') : '/');
      } finally {
        setSigningInAs(null);
      }
    },
    [router],
  );

  if (state === 'loading') return <FullPageLoader label="Loading demo users" />;

  if (state === 'disabled') {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          title="Dev sign-in isn't enabled"
          description="Set DEV_AUTH_BYPASS=true (plus AUTH_JWKS_URI and AUTH_ISSUER) in apps/api's .env and restart the API — see apps/api/src/auth/README.md, 'Local dev without Auth0'."
        />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-lg py-16">
        <ErrorState onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-16">
      <div className="text-center">
        <h1 className="text-h2 text-foreground">Sign in as a demo user</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Local dev only — mints a real access token for a seeded user, no Auth0 needed.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No seeded users found" description="Run pnpm db:seed against your local database first." />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <Card key={user.userId}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-body-md font-medium text-foreground">{user.name}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {user.email} · {user.organizationName}
                  </p>
                  {user.role && <Badge variant="outline" className="mt-1.5">{user.role}</Badge>}
                </div>
                <Button
                  size="sm"
                  disabled={signingInAs === user.userId}
                  onClick={() => void handleSignIn(user)}
                >
                  {signingInAs === user.userId ? 'Signing in…' : 'Sign in'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
