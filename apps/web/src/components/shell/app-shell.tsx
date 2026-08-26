'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';
import { PORTAL_CONFIGS } from './portal-config';

type PortalConfigKey = keyof typeof PORTAL_CONFIGS;

interface AppShellProps {
  /**
   * The portal to render. A string key rather than a full config object so
   * this component can be invoked from a server component layout without
   * crossing an icon-function reference over the RSC serialization
   * boundary — the sidebar's icon components are looked up locally here on
   * the client.
   */
  portalKey: PortalConfigKey;
  children: React.ReactNode;
}

/**
 * The single, shared application layout every portal renders inside. Given
 * a portal key it draws the (identical, code-wise) sidebar + top bar with
 * role-appropriate navigation — no portal duplicates the layout, they
 * only supply the portalKey via their app/**\/layout.tsx wrapper.
 */
export function AppShell({ portalKey, children }: AppShellProps) {
  const config = PORTAL_CONFIGS[portalKey];

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex md:h-screen md:sticky md:top-0">
        <Sidebar config={config} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav config={config} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
