'use client';

import { useEffect, useState } from 'react';
import { DashboardStats } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Users, UserPlus, Phone, Calendar, CheckCircle, XCircle,
  TrendingUp, Clock
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Candidates', value: stats?.total_candidates || 0, icon: Users, color: 'bg-navy', textColor: 'text-white', iconColor: 'text-gold' },
    { label: 'New This Week', value: stats?.new_this_week || 0, icon: UserPlus, color: 'bg-gold', textColor: 'text-navy-dark', iconColor: 'text-navy' },
    { label: 'Contacted', value: stats?.contacted || 0, icon: Phone, color: 'bg-orange-50', textColor: 'text-orange-900', iconColor: 'text-orange-500' },
    { label: 'Interviewing', value: stats?.interviewing || 0, icon: Calendar, color: 'bg-emerald-50', textColor: 'text-emerald-900', iconColor: 'text-emerald-500' },
    { label: 'Hired', value: stats?.hired || 0, icon: CheckCircle, color: 'bg-green-50', textColor: 'text-green-900', iconColor: 'text-green-500' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'bg-red-50', textColor: 'text-red-900', iconColor: 'text-red-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-text-secondary mt-1">Welcome to the Warehouse Now Talent Acquisition Platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} rounded-xl p-4 ${card.textColor}`}>
            <div className="flex items-center justify-between mb-3">
              <card.icon size={24} className={card.iconColor} />
              <TrendingUp size={16} className="opacity-40" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs mt-1 opacity-75">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-whn-border">
          <div className="px-6 py-4 border-b border-whn-border flex items-center justify-between">
            <h2 className="font-semibold text-navy flex items-center gap-2">
              <Clock size={18} />
              Recent Candidates
            </h2>
            <a href="/candidates" className="text-sm text-navy-light hover:text-navy font-medium">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Designation</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_candidates && stats.recent_candidates.length > 0 ? (
                  stats.recent_candidates.map(c => (
                    <tr key={c.id} className="border-t border-whn-border hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <a href={`/candidates?id=${c.id}`} className="font-medium text-navy hover:text-navy-light">
                          {c.full_name || 'Unnamed'}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{c.current_designation || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary">{c.current_location || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.source}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {c.date_added ? format(new Date(c.date_added), 'dd MMM yyyy') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                      <Users size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No candidates yet. Upload resumes to get started.</p>
                      <a href="/upload" className="text-navy-light hover:text-navy font-medium text-sm mt-2 inline-block">
                        Upload Resumes
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-whn-border">
          <div className="px-6 py-4 border-b border-whn-border">
            <h2 className="font-semibold text-navy">Sources Breakdown</h2>
          </div>
          <div className="p-6">
            {stats?.sources && stats.sources.length > 0 ? (
              <div className="space-y-4">
                {stats.sources.map(s => {
                  const pct = stats.total_candidates > 0
                    ? Math.round((s.count / stats.total_candidates) * 100) : 0;
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-navy font-medium">{s.source}</span>
                        <span className="text-text-secondary">{s.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-gold rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-text-secondary text-sm text-center py-8">No data yet</p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-whn-border">
            <h3 className="font-semibold text-navy text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/upload" className="block w-full bg-gold text-navy-dark text-center text-sm font-semibold py-2 rounded-lg hover:bg-gold-dark transition-colors">
                Upload Resumes
              </a>
              <a href="/referral" className="block w-full border border-navy text-navy text-center text-sm font-semibold py-2 rounded-lg hover:bg-navy hover:text-white transition-colors">
                Referral Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
