'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger } from '@lms/ui';
import { Sidebar } from './sidebar';
import type { PortalConfig } from './portal-config';

interface MobileNavProps {
  config: PortalConfig;
}

/**
 * Mobile-only hamburger that opens the same Sidebar inside a left-side
 * Drawer — the sidebar itself is the single source of navigation truth
 * across breakpoints (no duplicated nav config, no divergent labels).
 * Auto-closes when the route changes so tapping a link doesn't leave the
 * drawer covering the destination page.
 */
export function MobileNav({ config }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const openedForPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (openedForPath.current === null) {
        openedForPath.current = pathname;
      } else if (openedForPath.current !== pathname) {
        setOpen(false);
        openedForPath.current = null;
      }
    } else {
      openedForPath.current = null;
    }
  }, [pathname, open]);

  return (
    <div className="md:hidden">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger
          aria-label="Open menu"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-navy-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu className="size-5" aria-hidden="true" />
        </DrawerTrigger>
        <DrawerContent side="left" className="w-72 p-0">
          <Sidebar config={config} className="h-full w-full border-r-0" />
        </DrawerContent>
      </Drawer>
    </div>
  );
}
