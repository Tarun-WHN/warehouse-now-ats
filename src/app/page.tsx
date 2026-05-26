'use client';

import { useEffect, useState } from 'react';
import { DashboardStats, Job, Interview } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Users, UserPlus, Phone, Calendar, CheckCircle, XCircle,
  TrendingUp, Clock, Briefcase, Eye, ArrowRight, BarChart3,
  Target, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/jobs?status=Open').then(r => r.json()),
      fetch('/api/interviews?upcoming=true').then(r => r.json()),
    ]).then(([s, j, i]) => {
      setStats(s);
      setJobs(j.slice(0, 5));
      setUpcomingInterviews(i.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}</div>
      </div>
    </div>
  );

  const cards = [
    { label: 'Total Candidates', value: stats?.total_candidates || 0, icon: Users, color: 'bg-navy', textColor: 'text-white', iconColor: 'text-gold' },
    { label: 'New This Week', value: stats?.new_this_week || 0, icon: UserPlus, color: 'bg-gold', textColor: 'text-navy-dark', iconColor: 'text-navy' },
    { label: 'Screening', value: stats?.screening || 0, icon: Eye, color: 'bg-cyan-50', textColor: 'text-cyan-900', iconColor: 'text-cyan-500' },
    { label: 'Interviewing', value: stats?.interviewing || 0, icon: Calendar, color: 'bg-emerald-50', textColor: 'text-emerald-900', iconColor: 'text-emerald-500' },
    { label: 'Offered', value: stats?.offered || 0, icon: Target, color: 'bg-purple-50', textColor: 'text-purple-900', iconColor: 'text-purple-500' },
    { label: 'Hired', value: stats?.hired || 0, icon: CheckCircle, color: 'bg-green-50', textColor: 'text-green-900', iconColor: 'text-green-500' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'bg-red-50', textColor: 'text-red-900', iconColor: 'text-red-500' },
    { label: 'On Hold', value: stats?.on_hold || 0, icon: Clock, color: 'bg-gray-50', textColor: 'text-gray-900', iconColor: 'text-gray-500' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-text-secondary mt-1 text-sm">Welcome to Warehouse Now Talent Acquisition</p>
        </div>
        <div className="text-xs text-text-secondary bg-white border border-whn-border px-3 py-1.5 rounded-lg">
          Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-navy font-mono">Cmd+K</kbd> to search
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} rounded-xl p-3 ${card.textColor}`}>
            <div className="flex items-center justify-between mb-2">
              <card.icon size={18} className={card.iconColor} />
            </div>
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-[10px] mt-0.5 opacity-75">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Candidates */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-whn-border">
          <div className="px-5 py-3 border-b border-whn-border flex items-center justify-between">
            <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><Clock size={16} /> Recent Candidates</h2>
            <Link href="/candidates" className="text-xs text-navy-light hover:text-navy font-medium flex items-center gap-1">View All <ArrowRight size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Name</th>
                  <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Role</th>
                  <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Location</th>
                  <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Source</th>
                  <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_candidates?.length ? stats.recent_candidates.map(c => (
                  <tr key={c.id} className="border-t border-whn-border hover:bg-gray-50">
                    <td className="px-4 py-2.5"><Link href="/candidates" className="font-medium text-navy hover:underline text-sm">{c.full_name || 'Unnamed'}</Link></td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">{c.current_designation || '-'}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">{c.current_location || '-'}</td>
                    <td className="px-4 py-2.5"><span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{c.source}</span></td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} size="xs" /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-secondary text-sm">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />No candidates yet. <Link href="/upload" className="text-navy font-medium">Upload resumes</Link>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Open Jobs */}
          <div className="bg-white rounded-xl border border-whn-border">
            <div className="px-5 py-3 border-b border-whn-border flex items-center justify-between">
              <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><Briefcase size={16} /> Open Jobs</h2>
              <Link href="/jobs" className="text-xs text-navy-light hover:text-navy font-medium">{jobs.length} active</Link>
            </div>
            <div className="p-4">
              {jobs.length > 0 ? jobs.map(j => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-navy">{j.title}</p>
                    <p className="text-xs text-text-secondary">{j.department_name} {j.warehouse_site ? `| ${j.warehouse_site}` : ''}</p>
                  </div>
                  <span className="text-xs bg-navy/5 text-navy px-2 py-0.5 rounded-full">{j.num_positions} pos</span>
                </Link>
              )) : <p className="text-sm text-text-secondary text-center py-4">No open jobs</p>}
            </div>
          </div>

          {/* Upcoming Interviews */}
          <div className="bg-white rounded-xl border border-whn-border">
            <div className="px-5 py-3 border-b border-whn-border flex items-center justify-between">
              <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><Calendar size={16} /> Upcoming Interviews</h2>
              <Link href="/interviews" className="text-xs text-navy-light hover:text-navy font-medium">View All</Link>
            </div>
            <div className="p-4">
              {upcomingInterviews.length > 0 ? upcomingInterviews.map(i => (
                <div key={i.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 bg-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{i.candidate_name}</p>
                    <p className="text-xs text-text-secondary">{new Date(i.scheduled_at).toLocaleDateString()} {new Date(i.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-text-secondary text-center py-4">No upcoming interviews</p>}
            </div>
          </div>

          {/* Source Conversion */}
          {stats?.source_conversion && stats.source_conversion.length > 0 && (
            <div className="bg-white rounded-xl border border-whn-border">
              <div className="px-5 py-3 border-b border-whn-border">
                <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><BarChart3 size={16} /> Source Effectiveness</h2>
              </div>
              <div className="p-4 space-y-3">
                {stats.source_conversion.map(s => (
                  <div key={s.source}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-navy font-medium">{s.source}</span>
                      <span className="text-text-secondary">{s.total} total | {s.rate}% advanced</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-gold rounded-full h-1.5 transition-all" style={{ width: `${s.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Velocity */}
          {stats?.pipeline_velocity && stats.pipeline_velocity.length > 0 && (
            <div className="bg-white rounded-xl border border-whn-border">
              <div className="px-5 py-3 border-b border-whn-border">
                <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><Zap size={16} /> Pipeline Velocity</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {stats.pipeline_velocity.map(v => (
                    <div key={v.status} className="text-center bg-gray-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-navy">{v.avg_days}d</p>
                      <p className="text-[10px] text-text-secondary">{v.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <Link href="/upload" className="block w-full bg-gold text-navy-dark text-center text-sm font-semibold py-2.5 rounded-lg hover:bg-gold-dark">
              Upload Resumes
            </Link>
            <Link href="/referral" className="block w-full border border-navy text-navy text-center text-sm font-semibold py-2.5 rounded-lg hover:bg-navy hover:text-white transition-colors">
              Referral Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
