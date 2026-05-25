'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  LayoutDashboard, Users, Upload, Mail, UserPlus, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/upload', label: 'Upload Resumes', icon: Upload },
  { href: '/templates', label: 'Email Templates', icon: Mail },
  { href: '/referral', label: 'Referral Portal', icon: UserPlus },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-navy-dark min-h-screen flex flex-col transition-all duration-200 relative`}>
      <div className={`p-4 border-b border-navy-light ${collapsed ? 'px-2' : ''}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <svg viewBox="0 0 48 48" className="h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="44" height="36" rx="3" fill="#FFD100"/>
              <text x="6" y="26" fill="#1B1464" fontWeight="bold" fontSize="16" fontFamily="Arial">wh</text>
              <rect x="4" y="30" width="40" height="10" rx="2" fill="white"/>
              <text x="6" y="39" fill="#1B1464" fontWeight="bold" fontSize="13" fontFamily="Arial">now</text>
            </svg>
          </div>
        ) : (
          <Logo size="md" />
        )}
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gold text-navy-dark'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-navy border-2 border-navy-light rounded-full p-1 text-gold hover:bg-navy-light transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!collapsed && (
        <div className="p-4 border-t border-navy-light">
          <div className="text-xs text-gray-400">
            <p className="font-medium text-gray-300">Warehouse Now ATS</p>
            <p className="mt-1">Talent Acquisition Platform</p>
          </div>
        </div>
      )}
    </aside>
  );
}
