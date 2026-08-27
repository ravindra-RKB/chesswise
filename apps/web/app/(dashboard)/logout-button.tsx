'use client';

import { logout } from '../(auth)/actions';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="mt-3 w-full rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      Sign Out
    </button>
  );
}
