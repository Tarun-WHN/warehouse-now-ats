'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Remark } from '@/lib/types';
import { Star, ClipboardCheck, Search, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

// A reviewer's full set of comments on one candidate, collapsed into a single line item.
type ReviewGroup = {
  key: string;
  candidate_name: string;
  author_name: string;
  latestStage: string;
  latestOutcome: string;
  latestRating: number;
  latestDate: string;
  entries: Remark[];
};

const OUTCOMES = ['Shortlisted', 'Selected', 'Rejected', 'On Hold'];
const STAGES = ['Screening', 'Technical', 'HR', 'Final'];

const outcomeColors: Record<string, string> = {
  Shortlisted: 'bg-blue-100 text-blue-700',
  Selected: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Remark[]>([]);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('');
  const [stage, setStage] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const fetchReviews = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (outcome) params.set('outcome', outcome);
    if (stage) params.set('stage', stage);
    fetch(`/api/reviews?${params}`).then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : []));
  }, [search, outcome, stage]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Collapse all comments from the same reviewer on the same candidate into one line item.
  // `reviews` arrives newest-first, so the first entry seen per group is the latest.
  const groups = useMemo<ReviewGroup[]>(() => {
    const map = new Map<string, ReviewGroup>();
    for (const r of reviews) {
      const key = `${r.candidate_id || r.candidate_name || '?'}::${(r.author_name || 'Anonymous').toLowerCase()}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          candidate_name: r.candidate_name || '—',
          author_name: r.author_name || 'Anonymous',
          latestStage: r.stage || '',
          latestOutcome: r.outcome || '',
          latestRating: r.rating || 0,
          latestDate: r.created_at,
          entries: [],
        };
        map.set(key, g);
      }
      // First non-empty outcome wins (newest-first ordering means latest decision).
      if (!g.latestOutcome && r.outcome) g.latestOutcome = r.outcome;
      g.entries.push(r);
    }
    return Array.from(map.values());
  }, [reviews]);

  const counts = OUTCOMES.reduce((acc, o) => {
    acc[o] = groups.filter(g => g.latestOutcome === o).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <ClipboardCheck size={24} /> Screening & Interview Reviews
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          All candidate feedback — who screened/interviewed, the outcome, and their comments.
        </p>
      </div>

      {/* Outcome summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {OUTCOMES.map(o => (
          <button key={o} onClick={() => setOutcome(outcome === o ? '' : o)}
            className={`text-left p-4 rounded-xl border transition-all ${outcome === o ? 'border-gold bg-gold/10' : 'border-whn-border bg-white hover:shadow-sm'}`}>
            <p className="text-2xl font-bold text-navy">{counts[o] || 0}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${outcomeColors[o]}`}>{o}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by candidate or reviewer..."
            className="w-full pl-9 pr-3 py-2.5 border border-whn-border rounded-lg text-sm" />
        </div>
        <select value={stage} onChange={e => setStage(e.target.value)}
          className="px-3 py-2.5 border border-whn-border rounded-lg text-sm">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={outcome} onChange={e => setOutcome(e.target.value)}
          className="px-3 py-2.5 border border-whn-border rounded-lg text-sm">
          <option value="">All Outcomes</option>
          {OUTCOMES.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {/* Reviews table */}
      <div className="bg-white rounded-xl border border-whn-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Reviewed By</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Stage</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Rating</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Outcome</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Comments</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const isOpen = expanded.has(g.key);
                const latest = g.entries[0];
                const hasMore = g.entries.length > 1;
                return (
                  <tr key={g.key} className="border-t border-whn-border hover:bg-gray-50/50 align-top">
                    <td className="py-3 px-4 font-semibold text-navy text-sm">{g.candidate_name}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{g.author_name}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-medium">{g.latestStage || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= g.latestRating ? 'fill-gold text-gold' : 'text-gray-200'} />)}</div>
                    </td>
                    <td className="py-3 px-4">
                      {g.latestOutcome
                        ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${outcomeColors[g.latestOutcome] || 'bg-gray-100 text-gray-600'}`}>{g.latestOutcome}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary max-w-[420px]">
                      {!isOpen ? (
                        <div className="flex items-start gap-1.5">
                          <MessageSquare size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{latest.comment}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {g.entries.map(e => (
                            <div key={e.id} className="flex items-start gap-1.5">
                              <MessageSquare size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                              <div>
                                <span>{e.comment}</span>
                                <span className="block text-[10px] text-gray-400 mt-0.5">
                                  {e.stage ? `${e.stage} · ` : ''}{new Date(e.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {hasMore && (
                        <button onClick={() => toggleExpand(g.key)}
                          className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-navy hover:underline">
                          {isOpen
                            ? <><ChevronDown size={12} /> Hide comments</>
                            : <><ChevronRight size={12} /> Show all {g.entries.length} comments</>}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{new Date(g.latestDate).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {groups.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-text-secondary">
                  <ClipboardCheck size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm mt-1">Feedback added on candidates (with an outcome) will appear here.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
