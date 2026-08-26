import { AppShell } from '../../components/shell';

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell portalKey="learner">{children}</AppShell>;
}
