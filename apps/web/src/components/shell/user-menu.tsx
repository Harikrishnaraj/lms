'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lms/ui';
import { useCurrentUser } from '../../lib/current-user';
import { PORTAL_SWITCHER, type Portal } from './portal-config';

interface UserMenuProps {
  currentPortal: Portal;
}

/**
 * The user profile menu plus, for users who hold roles across multiple
 * portals, the portal switcher (learner / trainer / administration). Filters
 * the switcher by the roles on `useCurrentUser`, so a Learner-only user
 * doesn't see a "switch to Trainer" entry that would 403 them.
 */
export function UserMenu({ currentPortal }: UserMenuProps) {
  const user = useCurrentUser();
  const availablePortals = PORTAL_SWITCHER.filter((p) => canAccessPortal(user.roles, p.key));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 text-body-sm transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Avatar size="sm" fallback={user.initials} />
        <span className="hidden text-body-sm font-medium text-foreground md:inline">{user.name}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar fallback={user.initials} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-body-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <div className="px-2 pb-2 text-label-sm text-muted-foreground">{user.organizationName}</div>
        <DropdownMenuSeparator />
        {availablePortals.length > 1 && (
          <>
            <DropdownMenuLabel>Switch portal</DropdownMenuLabel>
            {availablePortals.map((portal) => (
              <DropdownMenuItem key={portal.key} asChild disabled={portal.key === currentPortal}>
                <Link href={portal.href}>
                  {portal.label}
                  {portal.key === currentPortal && (
                    <span className="ml-auto text-label-sm text-muted-foreground">current</span>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="size-4" aria-hidden="true" />
            My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-error-600 focus:text-error-700">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function canAccessPortal(roles: ReturnType<typeof useCurrentUser>['roles'], portal: Portal): boolean {
  if (portal === 'learner') return roles.includes('LEARNER');
  if (portal === 'trainer') return roles.includes('TRAINER');
  return (
    roles.includes('MANAGER') || roles.includes('HR_LD_ADMIN') || roles.includes('ORGANIZATION_ADMIN')
  );
}
