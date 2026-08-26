import { redirect } from 'next/navigation';

/**
 * /admin has no landing screen of its own — it always resolves to one of
 * the concrete admin workspaces. Once client-side auth lands, this should
 * pick the highest-privilege workspace the caller can access:
 * organization > hr > manager. For now the placeholder just sends everyone
 * to /admin/manager, which the sidebar's workspace switcher can navigate
 * away from.
 */
export default function AdminIndexPage(): never {
  redirect('/admin/manager');
}
