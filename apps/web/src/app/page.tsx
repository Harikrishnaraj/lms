import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="text-h1 text-foreground">LMS</h1>
      <p className="text-body-lg text-muted-foreground">Corporate Learning Management System</p>
      <Link href="/style-guide" className="text-body-sm font-medium text-primary hover:underline">
        View the design system →
      </Link>
    </main>
  );
}
