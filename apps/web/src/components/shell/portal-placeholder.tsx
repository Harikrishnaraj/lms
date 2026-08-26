import { EmptyState } from '@lms/ui';

interface PortalPlaceholderProps {
  title: string;
  description?: string;
}

/**
 * Stand-in for a portal screen. Portal-specific business features live in
 * their own PR — this exists so the shell has a real body to render while
 * navigation, breadcrumbs, and responsive behavior are being verified.
 */
export function PortalPlaceholder({ title, description }: PortalPlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-foreground">{title}</h1>
        {description && <p className="mt-1 text-body-md text-muted-foreground">{description}</p>}
      </div>
      <EmptyState
        title="Coming soon"
        description="Business features for this workspace will land in a later phase. Navigation, roles, and layout are wired up and ready to build on."
      />
    </div>
  );
}
