'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { SearchInput, cn } from '@lms/ui';
import type { PortalConfig } from './portal-config';
import { ShellBreadcrumbs } from './shell-breadcrumbs';
import { NotificationsMenu } from './notifications-menu';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';

interface TopNavProps {
  config: PortalConfig;
}

export function TopNav({ config }: TopNavProps) {
  const [search, setSearch] = React.useState('');

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <MobileNav config={config} />
      <div className="hidden min-w-0 flex-1 md:block">
        <ShellBreadcrumbs config={config} />
      </div>
      <div className={cn('flex flex-1 items-center justify-end gap-2 md:flex-none md:gap-3')}>
        <div className="hidden lg:block lg:w-72">
          <SearchInput
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search courses, learners…"
            aria-label="Global search"
          />
        </div>
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noreferrer"
          aria-label="Help"
          className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-navy-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex"
        >
          <HelpCircle className="size-5" aria-hidden="true" />
        </a>
        <NotificationsMenu />
        <UserMenu currentPortal={config.portal} />
      </div>
    </header>
  );
}
