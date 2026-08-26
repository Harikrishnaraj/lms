'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@lms/ui';
import type { PortalConfig } from './portal-config';
import { ADMIN_WORKSPACES } from './portal-config';

interface SidebarProps {
  config: PortalConfig;
  className?: string;
}

export function Sidebar({ config, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface',
        className,
      )}
      aria-label={`${config.label} navigation`}
    >
      <SidebarBrand config={config} />
      {config.portal === 'admin' && <AdminWorkspaceNav activeWorkspace={config.workspace} />}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {config.nav.flatMap((group) => group.items).map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function SidebarBrand({ config }: { config: PortalConfig }) {
  const homeHref =
    config.portal === 'admin'
      ? `/admin/${config.workspace ?? 'manager'}`
      : `/${config.portal}`;
  return (
    <Link
      href={homeHref}
      className="flex items-center gap-2 border-b border-border px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <span aria-hidden="true" className="text-label-md">
          LMS
        </span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-label-md text-foreground">LMS</span>
        <span className="text-label-sm text-muted-foreground">{config.label}</span>
      </span>
    </Link>
  );
}

function AdminWorkspaceNav({ activeWorkspace }: { activeWorkspace?: PortalConfig['workspace'] }) {
  return (
    <div className="px-3">
      <p className="mb-2 px-2 text-label-sm text-muted-foreground">Workspaces</p>
      <ul className="flex flex-col gap-1">
        {ADMIN_WORKSPACES.map((workspace) => {
          const isActive = workspace.key === activeWorkspace;
          return (
            <li key={workspace.key}>
              <Link
                href={workspace.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-navy-50 text-primary'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground',
                )}
              >
                {workspace.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SidebarItem({ item }: { item: { label: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> } }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isActive
            ? 'bg-navy-50 text-primary'
            : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
