// Authenticated admin screens should never be statically prerendered; every
// request depends on the caller's session and organization. Opting the whole
// /admin/hr/users subtree out here also sidesteps the "useSearchParams
// without a Suspense boundary" prerender error the list page would
// otherwise hit.
export const dynamic = 'force-dynamic';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
