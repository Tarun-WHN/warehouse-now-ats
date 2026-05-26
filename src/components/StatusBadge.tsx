'use client';

import { CandidateStatus } from '@/lib/types';

const statusConfig: Record<CandidateStatus, { bg: string; text: string; dot: string }> = {
  New: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Contacted: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  Screening: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  Interviewing: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Offered: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  Hired: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  Rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'On Hold': { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

export const STATUSES = Object.keys(statusConfig) as CandidateStatus[];

export function StatusBadge({ status, onChange, size = 'sm' }: {
  status: CandidateStatus;
  onChange?: (s: CandidateStatus) => void;
  size?: 'sm' | 'xs';
}) {
  const config = statusConfig[status] || statusConfig.New;
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  if (onChange) {
    return (
      <select
        value={status}
        onChange={e => onChange(e.target.value as CandidateStatus)}
        className={`${config.bg} ${config.text} text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-gold`}
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} font-semibold rounded-full ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}
