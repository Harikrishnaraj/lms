import { AppShell } from '../../../components/shell';

export default function AdminManagerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="admin:manager">{children}</AppShell>;
}
