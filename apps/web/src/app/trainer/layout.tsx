import { AppShell } from '../../components/shell';

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="trainer">{children}</AppShell>;
}
