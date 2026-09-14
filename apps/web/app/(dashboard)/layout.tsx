import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoutButton } from './logout-button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', disabled: false },
  { href: '/play', label: 'Play', icon: '♟', disabled: false },
  { href: '/analyze', label: 'Analyze', icon: '📊', disabled: false },
  { href: '/import', label: 'Import', icon: '📥', disabled: false },
  { href: '/profile', label: 'Profile', icon: '📈', disabled: false },
  { href: '/train', label: 'Train', icon: '🎯', disabled: false },
  { href: '/coach', label: 'Coach', icon: '💬', disabled: false },
  { href: '/settings', label: 'Settings', icon: '⚙️', disabled: true },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <span className="font-serif text-lg font-bold text-foreground">Chesswise</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                item.disabled
                  ? 'cursor-not-allowed text-muted-foreground/50'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              aria-disabled={item.disabled}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.disabled && (
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <span className="font-serif text-lg font-bold text-foreground">Chesswise</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-border bg-card py-2 md:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-0.5 text-muted-foreground"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
