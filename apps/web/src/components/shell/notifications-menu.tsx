'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lms/ui';

interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
}

// Placeholder — replace with a real /api/v1/notifications hook when the
// notifications module lands. Kept here (not global state) so this
// component is drop-in-swappable without touching the shell layout.
const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Course assigned', description: '"Compliance 2026" is due next Friday.', read: false },
  { id: '2', title: 'Certificate issued', description: 'You earned the "Leadership" certificate.', read: false },
  { id: '3', title: 'New reply', description: 'Priya replied on "Module 3 discussion".', read: true },
];

export function NotificationsMenu() {
  const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-navy-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-error-500 ring-2 ring-surface"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-label-md text-foreground">Notifications</span>
          {unreadCount > 0 && <Badge variant="primary">{unreadCount} new</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEMO_NOTIFICATIONS.length === 0 ? (
          <div className="px-3 py-6 text-center text-body-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          DEMO_NOTIFICATIONS.map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-0.5 py-2">
              <div className="flex w-full items-center gap-2">
                {!notification.read && (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                )}
                <span className="text-body-sm font-medium text-foreground">{notification.title}</span>
              </div>
              <span className="text-body-sm text-muted-foreground">{notification.description}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-body-sm text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
