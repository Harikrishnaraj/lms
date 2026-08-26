'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, type BreadcrumbItem } from '@lms/ui';
import type { PortalConfig } from './portal-config';

interface ShellBreadcrumbsProps {
  config: PortalConfig;
}

const LABEL_OVERRIDES: Record<string, string> = {
  admin: 'Administration',
  hr: 'HR / L&D',
  organization: 'Organization',
  manager: 'Manager',
  learner: 'Learner',
  trainer: 'Trainer',
};

/**
 * Auto-derives crumbs from the current pathname. Falls back to
 * title-casing each segment if no override matches; the first crumb is
 * always the current portal's landing page.
 */
export function ShellBreadcrumbs({ config }: ShellBreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label =
      LABEL_OVERRIDES[segment] ??
      config.nav.flatMap((g) => g.items).find((item) => item.href === href)?.label ??
      titleCase(segment);
    return { label, href };
  });

  return (
    <Breadcrumbs
      items={items}
      renderLink={(item) => (
        <Link href={item.href!} className="hover:text-primary hover:underline">
          {item.label}
        </Link>
      )}
    />
  );
}

function titleCase(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
