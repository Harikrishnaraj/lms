import { AppShell } from '../../../components/shell';

// Authenticated admin screens should never be statically prerendered; every
// request depends on the caller's session and organization. This also
// sidesteps the "useSearchParams without a Suspense boundary" prerender
// error that any list/filter page in this subtree would otherwise hit
// (see admin/hr/users/layout.tsx, where this pattern originated).
export const dynamic = 'force-dynamic';

export default function AdminManagerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="admin:manager">{children}</AppShell>;
}
