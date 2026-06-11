'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Candidate, CandidateStatus, Department, EmailTemplate } from '@/lib/types';
import { StatusBadge, STATUSES } from '@/components/StatusBadge';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TimeInStageBadge } from '@/components/TimeInStageBadge';
import { Modal } from '@/components/Modal';
import {
  Search, Download, Filter, Eye, Trash2, FileText,
  ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Table, Star,
  Copy, Link, CheckSquare, Square, Mail, Building2, Edit3, UserPlus, MapPin
} from 'lucide-react';
import { Remark } from '@/lib/types';

const SOURCES = ['Manual Upload', 'Excel Import', 'Referral', 'Career Page', 'Job Portal', 'LinkedIn', 'Walk-in'];
const OUTCOMES = ['Shortlisted', 'Selected', 'Rejected', 'On Hold'];
const outcomeColors: Record<string, string> = {
  Shortlisted: 'bg-blue-100 text-blue-700',
  Selected: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [grouped, setGrouped] = useState(true);
  const [collapsedLocs, setCollapsedLocs] = useState<Set<string>>(new Set());

  // Column filters
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkTemplateId, setBulkTemplateId] = useState('');

  // Detail modal
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'resume' | 'remarks' | 'activity'>('info');
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoBackup, setInfoBackup] = useState<Candidate | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [activity, setActivity] = useState<{ action: string; details: string; timestamp: string; performed_by: string }[]>([]);

  // Remark form
  const [remarkAuthor, setRemarkAuthor] = useState('');
  const [remarkStage, setRemarkStage] = useState('Screening');
  const [remarkRating, setRemarkRating] = useState(0);
  const [remarkComment, setRemarkComment] = useState('');
  const [remarkOutcome, setRemarkOutcome] = useState('');

  // Edit modal
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);

  const perPage = 50;

  const fetchCandidates = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    if (filters.status) params.set('status', filters.status);
    if (filters.source) params.set('source', filters.source);
    if (filters.location) params.set('location', filters.location);
    if (filters.designation) params.set('designation', filters.designation);
    if (filters.department_id) params.set('department_id', filters.department_id);
    if (filters.notice_period) params.set('notice_period', filters.notice_period);

    fetch(`/api/candidates?${params}`).then(r => r.json()).then(data => {
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
    });
  }, [search, page, filters]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(setDepartments);
    fetch('/api/email').then(r => r.json()).then(d => setTemplates(d.templates || d));
  }, []);

  const handleStatusChange = async (id: string, status: CandidateStatus) => {
    await fetch(`/api/candidates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchCandidates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this candidate?')) return;
    await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
    fetchCandidates();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('format', 'csv');
    window.open(`/api/candidates?${params}`, '_blank');
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleSelectAll = () => {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates.map(c => c.id)));
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    await fetch('/api/candidates/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status_change', candidate_ids: Array.from(selected), data: { status: bulkStatus } }),
    });
    setSelected(new Set()); setBulkStatus('');
    fetchCandidates();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected candidate${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    await fetch('/api/candidates/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', candidate_ids: Array.from(selected) }),
    });
    setSelected(new Set());
    fetchCandidates();
  };

  const handleBulkEmail = async () => {
    if (!bulkTemplateId) return;
    await fetch('/api/candidates/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_email', candidate_ids: Array.from(selected), data: { template_id: bulkTemplateId } }),
    });
    setSelected(new Set()); setBulkTemplateId('');
    alert('Emails queued for sending');
  };

  // Detail / Remarks
  const openDetail = async (c: Candidate) => {
    setDetailCandidate(c);
    setDetailTab('info');
    setEditingInfo(false);
    setInfoBackup(null);
    fetch(`/api/remarks?candidate_id=${c.id}`).then(r => r.json()).then(setRemarks);
    fetch(`/api/candidates/${c.id}?activity=true`).then(r => r.json()).then(setActivity);
  };

  const startEditInfo = () => {
    if (!detailCandidate) return;
    setInfoBackup(detailCandidate);
    setEditingInfo(true);
  };
  const cancelEditInfo = () => {
    if (infoBackup) setDetailCandidate(infoBackup);
    setInfoBackup(null);
    setEditingInfo(false);
  };
  const saveInfo = async () => {
    if (!detailCandidate) return;
    setSavingInfo(true);
    await fetch(`/api/candidates/${detailCandidate.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detailCandidate),
    });
    setSavingInfo(false);
    setEditingInfo(false);
    setInfoBackup(null);
    fetchCandidates();
  };

  const submitRemark = async () => {
    if (!detailCandidate || !remarkComment) return;
    await fetch('/api/remarks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: detailCandidate.id, author_name: remarkAuthor || 'Anonymous',
        author_role: '', rating: remarkRating, comment: remarkComment, stage: remarkStage, outcome: remarkOutcome,
      }),
    });
    fetch(`/api/remarks?candidate_id=${detailCandidate.id}`).then(r => r.json()).then(setRemarks);
    setRemarkComment(''); setRemarkRating(0); setRemarkOutcome('');
  };

  const copyPortalLink = (token?: string) => {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/portal?token=${token}`);
  };

  const handleEdit = async () => {
    if (!editCandidate) return;
    await fetch(`/api/candidates/${editCandidate.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCandidate),
    });
    setEditCandidate(null);
    fetchCandidates();
  };

  const totalPages = Math.ceil(total / perPage);

  // Group the current page of candidates by location, then by department within each location.
  const groupedCandidates = useMemo(() => {
    const locMap = new Map<string, Map<string, Candidate[]>>();
    for (const c of candidates) {
      const loc = (c.current_location || '').trim() || 'No Location';
      const dept = (c.department_name || '').trim() || 'No Department';
      if (!locMap.has(loc)) locMap.set(loc, new Map());
      const deptMap = locMap.get(loc)!;
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(c);
    }
    const sortKeys = (a: string, b: string) => {
      // Push the "No ..." buckets to the bottom, otherwise alphabetical.
      const aNo = a.startsWith('No '); const bNo = b.startsWith('No ');
      if (aNo !== bNo) return aNo ? 1 : -1;
      return a.localeCompare(b);
    };
    return Array.from(locMap.entries())
      .sort((a, b) => sortKeys(a[0], b[0]))
      .map(([loc, deptMap]) => ({
        loc,
        count: Array.from(deptMap.values()).reduce((n, arr) => n + arr.length, 0),
        depts: Array.from(deptMap.entries())
          .sort((a, b) => sortKeys(a[0], b[0]))
          .map(([dept, list]) => ({ dept, list })),
      }));
  }, [candidates]);

  const toggleLoc = (loc: string) => {
    setCollapsedLocs(prev => {
      const next = new Set(prev);
      next.has(loc) ? next.delete(loc) : next.add(loc);
      return next;
    });
  };

  const renderRow = (c: Candidate) => (
    <tr key={c.id} className={`border-t border-whn-border hover:bg-gray-50/50 ${selected.has(c.id) ? 'bg-gold/5' : ''}`}>
      <td className="py-2.5 px-3">
        <button onClick={() => toggleSelect(c.id)} className="text-gray-400 hover:text-navy">
          {selected.has(c.id) ? <CheckSquare size={16} className="text-gold" /> : <Square size={16} />}
        </button>
      </td>
      <td className="py-2.5 px-3">
        <button onClick={() => openDetail(c)} className="font-semibold text-navy text-sm hover:underline text-left">{c.full_name || '—'}</button>
      </td>
      <td className="py-2.5 px-3 text-xs text-text-secondary">
        <div>{c.phone || '—'}</div>
        <div className="truncate max-w-[140px]">{c.email || '—'}</div>
      </td>
      <td className="py-2.5 px-3 text-xs">
        <div className="font-medium text-navy">{c.current_designation || '—'}</div>
        <div className="text-text-secondary">{c.current_employer || ''}</div>
      </td>
      <td className="py-2.5 px-3 text-xs">
        {c.department_name ? (
          <span className="inline-flex items-center gap-1 bg-navy/5 text-navy px-1.5 py-0.5 rounded-full text-[10px] font-medium">
            <Building2 size={9} />{c.department_name}
          </span>
        ) : '—'}
      </td>
      <td className="py-2.5 px-3 text-xs text-text-secondary">{c.current_location || '—'}</td>
      <td className="py-2.5 px-3 text-xs text-text-secondary">{c.current_ctc || '—'}</td>
      <td className="py-2.5 px-3 text-xs text-text-secondary">{c.notice_period || '—'}</td>
      <td className="py-2.5 px-3">
        {c.source === 'Referral' ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 w-fit">
              <UserPlus size={9} /> Referral
            </span>
            {c.referrer_name && (
              <span className="text-[10px] text-purple-600 truncate max-w-[100px]" title={`Referred by ${c.referrer_name}`}>
                by {c.referrer_name}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded-full font-medium">{c.source}</span>
        )}
      </td>
      <td className="py-2.5 px-3">
        <StatusBadge status={c.status} onChange={s => handleStatusChange(c.id, s)} size="xs" />
      </td>
      <td className="py-2.5 px-3">
        <TimeInStageBadge statusChangedAt={c.status_changed_at} dateAdded={c.date_added} />
      </td>
      <td className="py-2.5 px-3">
        {c.resume_file ? (
          <a href={`/api/resume/${c.resume_file.replace('/uploads/', '')}`} target="_blank" rel="noreferrer"
            className="text-navy hover:text-gold" title={c.resume_filename}>
            <FileText size={16} />
          </a>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-0.5 justify-center">
          <button onClick={() => openDetail(c)} title="View" className="p-1 rounded hover:bg-gray-100"><Eye size={14} className="text-gray-500" /></button>
          <button onClick={() => copyPortalLink(c.portal_token)} title="Copy portal link" className="p-1 rounded hover:bg-gray-100"><Link size={14} className="text-gray-500" /></button>
          <button onClick={() => setEditCandidate(c)} title="Edit" className="p-1 rounded hover:bg-gray-100"><Edit3 size={14} className="text-gray-500" /></button>
          <button onClick={() => handleDelete(c.id)} title="Delete" className="p-1 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Candidates</h1>
          <p className="text-text-secondary text-sm mt-0.5">{total} total candidates</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${viewMode === 'table' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
              <Table size={14} /> Table
            </button>
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
          {viewMode === 'table' && (
            <button onClick={() => setGrouped(g => !g)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-1 ${grouped ? 'border-gold bg-gold/10 text-navy' : 'border-whn-border hover:bg-gray-50'}`}
              title="Group by location and department">
              <MapPin size={14} /> {grouped ? 'Grouped' : 'Group'}
            </button>
          )}
          <button onClick={handleExport} className="px-3 py-2 border border-whn-border rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone, employer..."
            className="w-full pl-9 pr-3 py-2.5 border border-whn-border rounded-lg text-sm" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2.5 border rounded-lg text-sm font-medium flex items-center gap-1 ${showFilters ? 'border-gold bg-gold/10 text-navy' : 'border-whn-border hover:bg-gray-50'}`}>
          <Filter size={14} /> Filters {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
        </button>
      </div>

      {/* Column filters row */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4 p-4 bg-white rounded-xl border border-whn-border animate-slide-in">
          <div>
            <label className="text-xs text-text-secondary font-medium">Status</label>
            <select value={filters.status || ''} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs">
              <option value="">All</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-medium">Source</label>
            <select value={filters.source || ''} onChange={e => { setFilters({ ...filters, source: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs">
              <option value="">All</option>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-medium">Department</label>
            <select value={filters.department_id || ''} onChange={e => { setFilters({ ...filters, department_id: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs">
              <option value="">All</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-medium">Location</label>
            <input value={filters.location || ''} onChange={e => { setFilters({ ...filters, location: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs" placeholder="City..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-medium">Designation</label>
            <input value={filters.designation || ''} onChange={e => { setFilters({ ...filters, designation: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs" placeholder="Role..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-medium">Notice Period</label>
            <select value={filters.notice_period || ''} onChange={e => { setFilters({ ...filters, notice_period: e.target.value }); setPage(1); }}
              className="w-full mt-1 px-2 py-1.5 border border-whn-border rounded-lg text-xs">
              <option value="">All</option>
              <option>Immediate</option><option>15 days</option><option>30 days</option><option>60 days</option><option>90 days</option>
            </select>
          </div>
          <div className="col-span-full">
            <button onClick={() => { setFilters({}); setPage(1); }} className="text-xs text-navy font-medium hover:underline">Clear all filters</button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 p-3 bg-navy/5 rounded-xl flex items-center gap-4 animate-slide-in flex-wrap">
          <span className="text-sm font-semibold text-navy">{selected.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="px-2 py-1.5 border border-whn-border rounded-lg text-xs">
            <option value="">Change status to...</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {bulkStatus && <button onClick={handleBulkStatus} className="bg-gold text-navy-dark px-3 py-1.5 rounded-lg text-xs font-bold">Apply Status</button>}

          <select value={bulkTemplateId} onChange={e => setBulkTemplateId(e.target.value)}
            className="px-2 py-1.5 border border-whn-border rounded-lg text-xs">
            <option value="">Send email...</option>
            {(Array.isArray(templates) ? templates : []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {bulkTemplateId && <button onClick={handleBulkEmail} className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Mail size={12} />Send</button>}

          <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-100 ml-auto">
            <Trash2 size={12} />Delete {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-text-secondary hover:underline">Clear selection</button>
        </div>
      )}

      {/* View */}
      {viewMode === 'kanban' ? (
        <KanbanBoard candidates={candidates} onStatusChange={handleStatusChange} onCandidateClick={(id) => {
          const c = candidates.find(x => x.id === id);
          if (c) openDetail(c);
        }} />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-whn-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full candidate-table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-3 text-left w-8">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-navy">
                        {selected.size === candidates.length && candidates.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Name</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Contact</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Role / Employer</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Dept</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Location</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">CTC</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Notice</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Source</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Days</th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">CV</th>
                    <th className="py-3 px-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped
                    ? groupedCandidates.map(group => {
                        const isCollapsed = collapsedLocs.has(group.loc);
                        return (
                          <Fragment key={`loc-${group.loc}`}>
                            {/* Location header */}
                            <tr className="bg-navy/5 border-t-2 border-navy/20">
                              <td colSpan={13} className="py-2 px-3">
                                <button onClick={() => toggleLoc(group.loc)} className="flex items-center gap-2 text-navy font-bold text-sm">
                                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                  <MapPin size={14} className="text-gold" />
                                  {group.loc}
                                  <span className="text-[10px] font-medium bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">{group.count}</span>
                                </button>
                              </td>
                            </tr>
                            {!isCollapsed && group.depts.map(d => (
                              <Fragment key={`${group.loc}-${d.dept}`}>
                                {/* Department sub-header */}
                                <tr className="bg-gray-50/70">
                                  <td colSpan={13} className="py-1.5 px-3 pl-9">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                      <Building2 size={11} /> {d.dept}
                                      <span className="text-[10px] font-medium text-gray-400 normal-case tracking-normal">({d.list.length})</span>
                                    </span>
                                  </td>
                                </tr>
                                {d.list.map(renderRow)}
                              </Fragment>
                            ))}
                          </Fragment>
                        );
                      })
                    : candidates.map(renderRow)}
                  {candidates.length === 0 && (
                    <tr><td colSpan={13} className="py-16 text-center text-text-secondary">No candidates found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-text-secondary">Page {page} of {totalPages} ({total} candidates)</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-whn-border hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg border border-whn-border hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailCandidate && (
        <Modal open={true} title={detailCandidate.full_name || 'Candidate'} onClose={() => setDetailCandidate(null)} size="lg">
          <div className="flex gap-2 mb-4 border-b border-whn-border pb-3">
            {(['info', 'resume', 'remarks', 'activity'] as const).map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${detailTab === tab ? 'bg-gold text-navy-dark' : 'text-text-secondary hover:bg-gray-100'}`}>
                {tab}
              </button>
            ))}
          </div>

          {detailTab === 'info' && (
            <div>
              <div className="flex justify-end mb-3">
                {!editingInfo ? (
                  <button onClick={startEditInfo}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-whn-border hover:bg-gray-50">
                    <Edit3 size={13} /> Edit info
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveInfo} disabled={savingInfo}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-gold text-navy-dark disabled:opacity-50">
                      {savingInfo ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEditInfo} disabled={savingInfo}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-whn-border hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!editingInfo ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { l: 'Name', v: detailCandidate.full_name },
                    { l: 'Phone', v: detailCandidate.phone }, { l: 'Email', v: detailCandidate.email },
                    { l: 'Location', v: detailCandidate.current_location }, { l: 'Designation', v: detailCandidate.current_designation },
                    { l: 'Employer', v: detailCandidate.current_employer }, { l: 'Department', v: detailCandidate.department_name },
                    { l: 'CTC', v: detailCandidate.current_ctc }, { l: 'Expected CTC', v: detailCandidate.expected_ctc },
                    { l: 'Notice Period', v: detailCandidate.notice_period }, { l: 'Source', v: detailCandidate.source },
                    { l: 'Referred By', v: detailCandidate.referrer_name ? `${detailCandidate.referrer_name}${detailCandidate.referrer_email ? ` (${detailCandidate.referrer_email})` : ''}` : undefined },
                    { l: 'Hometown', v: detailCandidate.hometown },
                  ].map(f => (
                    <div key={f.l}>
                      <span className="text-text-secondary text-xs">{f.l}</span>
                      <p className="font-medium text-navy">{f.v || '—'}</p>
                    </div>
                  ))}
                  {detailCandidate.portal_token && (
                    <div className="col-span-2">
                      <span className="text-text-secondary text-xs">Portal Link</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">{typeof window !== 'undefined' ? `${window.location.origin}/portal?token=${detailCandidate.portal_token}` : ''}</code>
                        <button onClick={() => copyPortalLink(detailCandidate.portal_token)} className="text-navy hover:text-gold"><Copy size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'full_name', label: 'Name' }, { key: 'phone', label: 'Phone' },
                    { key: 'email', label: 'Email' }, { key: 'current_location', label: 'Location' },
                    { key: 'current_designation', label: 'Designation' }, { key: 'current_employer', label: 'Employer' },
                    { key: 'current_ctc', label: 'Current CTC' }, { key: 'expected_ctc', label: 'Expected CTC' },
                    { key: 'notice_period', label: 'Notice Period' }, { key: 'hometown', label: 'Hometown' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-text-secondary text-xs">{f.label}</label>
                      <input value={(detailCandidate as unknown as Record<string, string>)[f.key] || ''}
                        onChange={e => setDetailCandidate({ ...detailCandidate, [f.key]: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
                    </div>
                  ))}
                  <div>
                    <label className="text-text-secondary text-xs">Department</label>
                    <select value={detailCandidate.department_id || ''}
                      onChange={e => {
                        const dept = departments.find(d => d.id === e.target.value);
                        setDetailCandidate({ ...detailCandidate, department_id: e.target.value, department_name: dept?.name });
                      }}
                      className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm">
                      <option value="">None</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-text-secondary text-xs">Notes</label>
                    <textarea value={detailCandidate.notes || ''}
                      onChange={e => setDetailCandidate({ ...detailCandidate, notes: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" rows={2} />
                  </div>
                </div>
              )}
            </div>
          )}

          {detailTab === 'resume' && (
            detailCandidate.resume_file ? (
              <iframe src={`/api/resume/${detailCandidate.resume_file.replace('/uploads/', '')}`}
                className="w-full h-[500px] rounded-lg border border-whn-border" />
            ) : <p className="text-center py-8 text-text-secondary">No resume uploaded</p>
          )}

          {detailTab === 'remarks' && (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <input value={remarkAuthor} onChange={e => setRemarkAuthor(e.target.value)}
                    placeholder="Your name" className="px-2 py-1.5 border border-whn-border rounded-lg text-xs" />
                  <select value={remarkStage} onChange={e => setRemarkStage(e.target.value)}
                    className="px-2 py-1.5 border border-whn-border rounded-lg text-xs">
                    <option>Screening</option><option>Technical</option><option>HR</option><option>Final</option>
                  </select>
                  <select value={remarkOutcome} onChange={e => setRemarkOutcome(e.target.value)}
                    className="px-2 py-1.5 border border-whn-border rounded-lg text-xs">
                    <option value="">Outcome...</option>
                    {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRemarkRating(s)}>
                        <Star size={16} className={s <= remarkRating ? 'fill-gold text-gold' : 'text-gray-300'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input value={remarkComment} onChange={e => setRemarkComment(e.target.value)}
                    placeholder="Add your feedback..." className="flex-1 px-3 py-1.5 border border-whn-border rounded-lg text-sm"
                    onKeyDown={e => e.key === 'Enter' && submitRemark()} />
                  <button onClick={submitRemark} disabled={!remarkComment}
                    className="bg-gold text-navy-dark px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">Add</button>
                </div>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {remarks.map(r => (
                  <div key={r.id} className="bg-white border border-whn-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy text-sm">{r.author_name}</span>
                        <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">{r.stage}</span>
                        {r.outcome && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${outcomeColors[r.outcome] || 'bg-gray-100 text-gray-600'}`}>{r.outcome}</span>}
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= r.rating ? 'fill-gold text-gold' : 'text-gray-200'} />)}</div>
                      </div>
                      <span className="text-xs text-text-secondary">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{r.comment}</p>
                  </div>
                ))}
                {remarks.length === 0 && <p className="text-center py-4 text-text-secondary text-sm">No remarks yet</p>}
              </div>
            </div>
          )}

          {detailTab === 'activity' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-navy mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-navy">{a.action}</p>
                    <p className="text-xs text-text-secondary">{a.details}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(a.timestamp).toLocaleString()} by {a.performed_by}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-center py-4 text-text-secondary text-sm">No activity</p>}
            </div>
          )}
        </Modal>
      )}

      {/* Edit Modal */}
      {editCandidate && (
        <Modal open={true} title="Edit Candidate" onClose={() => setEditCandidate(null)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'full_name', label: 'Full Name' }, { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' }, { key: 'current_location', label: 'Location' },
              { key: 'current_designation', label: 'Designation' }, { key: 'current_employer', label: 'Employer' },
              { key: 'current_ctc', label: 'Current CTC' }, { key: 'expected_ctc', label: 'Expected CTC' },
              { key: 'notice_period', label: 'Notice Period' }, { key: 'hometown', label: 'Hometown' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-text-secondary font-medium">{f.label}</label>
                <input value={(editCandidate as unknown as Record<string, string>)[f.key] || ''}
                  onChange={e => setEditCandidate({ ...editCandidate, [f.key]: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-text-secondary font-medium">Department</label>
              <select value={editCandidate.department_id || ''} onChange={e => setEditCandidate({ ...editCandidate, department_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm">
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary font-medium">Notes</label>
              <textarea value={editCandidate.notes || ''} onChange={e => setEditCandidate({ ...editCandidate, notes: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleEdit} className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold">Save</button>
            <button onClick={() => setEditCandidate(null)} className="px-6 py-2.5 rounded-lg text-sm border border-whn-border">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
