'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Settings {
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  lichessUsername: string | null;
  chessComUsername: string | null;
  xp: number;
  level: number;
}

function SettingField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(
          'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
          readOnly && 'cursor-not-allowed opacity-60',
        )}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    avatarUrl: '',
    lichessUsername: '',
    chessComUsername: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings(d.settings);
          setForm({
            displayName: d.settings.displayName ?? '',
            avatarUrl: d.settings.avatarUrl ?? '',
            lichessUsername: d.settings.lichessUsername ?? '',
            chessComUsername: d.settings.chessComUsername ?? '',
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  if (loading)
    return <div className="animate-pulse text-muted-foreground">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and platform preferences.
        </p>
      </div>

      {/* Profile */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Profile</h2>

        {form.avatarUrl && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.avatarUrl}
              alt="Avatar preview"
              className="h-14 w-14 rounded-full border border-border object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <p className="text-xs text-muted-foreground">Avatar preview</p>
          </div>
        )}

        <SettingField
          label="Display Name"
          placeholder="Your name"
          value={form.displayName}
          onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
        />
        <SettingField
          label="Email"
          value={settings?.email ?? ''}
          readOnly
          hint="Email cannot be changed here. Use Supabase Auth to update it."
        />
        <SettingField
          label="Avatar URL"
          placeholder="https://example.com/avatar.png"
          hint="Paste any public image URL."
          value={form.avatarUrl}
          onChange={(v) => setForm((f) => ({ ...f, avatarUrl: v }))}
        />
      </section>

      {/* Platform usernames */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Chess Platforms</h2>
        <p className="text-xs text-muted-foreground">
          Saved usernames will pre-fill the Import page so you don&apos;t have to type them each
          time.
        </p>
        <SettingField
          label="Lichess Username"
          placeholder="e.g. magnus"
          value={form.lichessUsername}
          onChange={(v) => setForm((f) => ({ ...f, lichessUsername: v }))}
        />
        <SettingField
          label="Chess.com Username"
          placeholder="e.g. hikaru"
          value={form.chessComUsername}
          onChange={(v) => setForm((f) => ({ ...f, chessComUsername: v }))}
        />
      </section>

      {/* XP info (read-only) */}
      {settings && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {settings.level}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Level {settings.level}</p>
              <p className="text-xs text-muted-foreground">{settings.xp} XP total</p>
            </div>
          </div>
        </section>
      )}

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-sm font-medium text-good animate-in fade-in">✓ Saved!</span>
        )}
      </div>
    </div>
  );
}
