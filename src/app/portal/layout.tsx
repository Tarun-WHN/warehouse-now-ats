import { Suspense } from 'react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><Suspense>{children}</Suspense></div>;
}
