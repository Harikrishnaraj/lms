'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { getOrganization, updateOrganization, type OrganizationProfile } from '../../../../lib/organization-admin-client';

export default function OrganizationSettingsPage() {
  const [org, setOrg] = React.useState<OrganizationProfile | null>(null);
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await getOrganization();
      setOrg(data);
      setName(data.name);
    } catch {
      setError('Failed to load settings.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateOrganization({ name });
      setOrg(updated);
      alert('Settings saved successfully!');
    } catch {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!org) return <FullPageLoader label="Loading settings" />;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <header>
        <h1 className="text-h2 text-foreground">Organization Settings</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Update your organization&apos;s general information and branding.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6">
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
          {/* Tenant Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Readonly Tenant Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-muted-foreground">Tenant Slug (readonly)</label>
            <input
              type="text"
              value={org.slug}
              readOnly
              className="h-10 rounded-lg border border-border bg-muted/20 px-3 text-body-md text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saving || !name.trim()}>
              <Save className="size-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
