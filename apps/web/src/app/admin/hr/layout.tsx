import { AppShell } from '../../../components/shell';

export default function AdminHrLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="admin:hr">{children}</AppShell>;
}
