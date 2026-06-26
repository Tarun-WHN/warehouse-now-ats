'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

// Top-level routes that have a matching FAQ entry on /help.
const KNOWN = new Set([
  'dashboard', 'candidates', 'jobs', 'interviews', 'reviews', 'offer-letters',
  'upload', 'templates', 'careers', 'referral', 'settings', 'account',
]);

// A small route-aware "?" that deep-links to this page's entry in the Help & FAQ.
export function HelpButton() {
  const pathname = usePathname();
  if (pathname.startsWith('/help')) return null;

  const seg = pathname === '/' ? 'dashboard' : pathname.split('/')[1];
  const href = KNOWN.has(seg) ? `/help#faq-${seg}` : '/help';

  return (
    <Link
      href={href}
      title="Help for this page"
      aria-label="Help for this page"
      className="fixed bottom-5 right-5 z-30 flex items-center gap-1.5 px-3 h-9 rounded-full bg-navy text-white shadow-lg hover:bg-navy-dark transition-colors text-xs font-semibold"
    >
      <HelpCircle size={16} /> Help
    </Link>
  );
}
