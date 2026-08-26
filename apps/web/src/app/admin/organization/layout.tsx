import { AppShell } from '../../../components/shell';

export default function AdminOrganizationLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="admin:organization">{children}</AppShell>;
}
