import Link from 'next/link';

const PORTALS: { href: string; label: string; description: string }[] = [
  { href: '/learner', label: 'Learner portal', description: 'For everyone taking courses.' },
  { href: '/trainer', label: 'Trainer portal', description: 'For course authors and instructors.' },
  { href: '/admin', label: 'Administration', description: 'Manager, HR / L&D, and organization workspaces.' },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-10 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 text-foreground">LMS</h1>
        <p className="text-body-lg text-muted-foreground">Corporate Learning Management System</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {PORTALS.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface px-5 py-4 text-left transition-shadow hover:shadow-level2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="text-h4 text-foreground">{portal.label}</span>
            <span className="text-body-sm text-muted-foreground">{portal.description}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <Link href="/login" className="text-body-sm font-medium text-primary hover:underline">
          Sign in →
        </Link>
        <Link href="/style-guide" className="text-body-sm font-medium text-primary hover:underline">
          View the design system →
        </Link>
        <Link href="/dev-login" className="text-body-sm font-medium text-primary hover:underline">
          Dev sign-in (local only) →
        </Link>
      </div>
    </main>
  );
}
