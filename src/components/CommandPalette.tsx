'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Briefcase, Users, X } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { CandidateStatus } from '@/lib/types';

interface SearchResult {
  candidates?: {
    id: string;
    full_name: string;
    current_designation: string;
    status: CandidateStatus;
  }[];
  jobs?: {
    id: string;
    title: string;
    department_name: string;
    status: string;
  }[];
  team?: {
    id: string;
    name: string;
    role: string;
  }[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({});
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({});
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const navigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const hasResults =
    (results.candidates && results.candidates.length > 0) ||
    (results.jobs && results.jobs.length > 0) ||
    (results.team && results.team.length > 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search candidates, jobs, team..."
            className="flex-1 text-sm text-navy bg-transparent outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults({}); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && !query && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">
                Press <kbd className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded font-mono mx-0.5">&#8984;K</kbd> to search
              </p>
            </div>
          )}

          {!isLoading && query && !hasResults && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">No results found</p>
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="py-2">
              {/* Candidates */}
              {results.candidates && results.candidates.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Candidates
                  </p>
                  {results.candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/candidates?id=${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                        <User size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{c.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.current_designation}</p>
                      </div>
                      <StatusBadge status={c.status} size="xs" />
                    </button>
                  ))}
                </div>
              )}

              {/* Jobs */}
              {results.jobs && results.jobs.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Jobs
                  </p>
                  {results.jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => navigate(`/jobs?id=${j.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center shrink-0">
                        <Briefcase size={14} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{j.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {j.department_name} &middot; {j.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Team Members */}
              {results.team && results.team.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Team Members
                  </p>
                  {results.team.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/settings?tab=team&id=${t.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                        <Users size={14} className="text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{t.name}</p>
                        <p className="text-xs text-gray-400 truncate">{t.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
