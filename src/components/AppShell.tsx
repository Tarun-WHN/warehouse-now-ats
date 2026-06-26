'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import CommandPalette from './CommandPalette';
import { AuthProvider } from './AuthProvider';
import { HelpButton } from './HelpButton';

// Routes that should NOT show the sidebar
const STANDALONE_ROUTES = ['/login', '/careers', '/referral', '/portal'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_ROUTES.some(r => pathname.startsWith(r));

  return (
    <AuthProvider>
      {isStandalone ? (
        <main className="flex-1 overflow-auto">{children}</main>
      ) : (
        <>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
          <HelpButton />
          <CommandPalette />
        </>
      )}
    </AuthProvider>
  );
}
