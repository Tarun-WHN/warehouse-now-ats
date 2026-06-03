'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  LayoutDashboard, Users, Upload, Mail, UserPlus, Settings,
  ChevronLeft, ChevronRight, Briefcase, Calendar, Globe, LogOut, ClipboardCheck
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';

const ALL_NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/candidates', label: 'Candidates', icon: Users, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/interviews', label: 'Interviews', icon: Calendar, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/reviews', label: 'Reviews', icon: ClipboardCheck, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/upload', label: 'Upload Resumes', icon: Upload, roles: ['Admin', 'Recruiter'] },
  { href: '/templates', label: 'Email Templates', icon: Mail, roles: ['Admin', 'Recruiter'] },
  { href: '/careers', label: 'Career Page', icon: Globe, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'] },
  { href: '/referral', label: 'Referral Portal', icon: UserPlus, roles: ['Admin', 'Recruiter', 'Hiring Manager'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['Admin', 'Recruiter'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navItems = ALL_NAV_ITEMS.filter(item =>
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-navy-dark min-h-screen flex flex-col transition-all duration-200 relative flex-shrink-0`}>
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

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gold text-navy-dark'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-navy border-2 border-navy-light rounded-full p-1 text-gold hover:bg-navy-light transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* User info + logout */}
      <div className="p-4 border-t border-navy-light">
        {user && !collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400">{user.role}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-400 p-1" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
        {user && collapsed && (
          <div className="flex justify-center mb-3">
            <button onClick={logout} className="text-gray-400 hover:text-red-400 p-1" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="text-xs text-gray-400">
              <p className="font-medium text-gray-300">Warehouse Now ATS</p>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
