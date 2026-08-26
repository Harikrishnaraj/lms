'use client';

/**
 * Placeholder for the client-side "who is signed in" hook. When the frontend
 * auth wiring lands (Auth0 SDK / token store, see apps/api/src/auth/README.md
 * for how the server side already works), replace the constant below with a
 * real hook that reads the current session — signature stays the same, so
 * shell components don't have to change.
 */

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** Two-letter initials for the avatar fallback. */
  initials: string;
  /** All roles the user holds — used by the portal switcher. */
  roles: Array<'LEARNER' | 'TRAINER' | 'MANAGER' | 'HR_LD_ADMIN' | 'ORGANIZATION_ADMIN'>;
  organizationName: string;
}

const DEMO_USER: CurrentUser = {
  id: 'auth0|demo-admin',
  name: 'Alex Johnson',
  email: 'alex.johnson@demo-org.example',
  initials: 'AJ',
  roles: ['LEARNER', 'TRAINER', 'MANAGER', 'HR_LD_ADMIN', 'ORGANIZATION_ADMIN'],
  organizationName: 'Demo Organization',
};

export function useCurrentUser(): CurrentUser {
  return DEMO_USER;
}
