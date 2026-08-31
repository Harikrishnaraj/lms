import { AppShell } from '../../components/shell';

// Authenticated portal screens should never be statically prerendered;
// every request depends on the caller's session and organization (same
// reasoning as the admin layouts -- see admin/hr/users/layout.tsx, where
// this pattern originated).
export const dynamic = 'force-dynamic';

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="learner">{children}</AppShell>;
}
