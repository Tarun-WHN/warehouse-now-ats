'use client';

import { useEffect, useState, useCallback } from 'react';
import { Candidate, CandidateStatus, ActivityLog, Remark } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  Eye, Mail, Edit, Trash2, ArrowUpDown, Plus,
  FileText, Clock, Phone, MapPin, Building2, Briefcase,
  MessageSquare, Star, ExternalLink, Copy, X
} from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['All', 'New', 'Contacted', 'Interviewing', 'Hired', 'Rejected'];
const SOURCES = ['All', 'Manual Upload', 'Excel Import', 'Naukri', 'Indeed', 'iimjobs', 'Email', 'WhatsApp', 'Referral', 'Walk-in'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [emailModal, setEmailModal] = useState<{ candidate: Candidate; type: string } | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({ status: 'New', source: 'Manual' });
  const [resumeModal, setResumeModal] = useState<{ url: string; filename: string } | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [newRemark, setNewRemark] = useState({ author_name: '', comment: '', rating: 0, stage: '' });
  const [remarkTab, setRemarkTab] = useState(false);
  const perPage = 50;

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    if (search) params.set('search', search);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (sourceFilter !== 'All') params.set('source', sourceFilter);

    fetch(`/api/candidates?${params}`)
      .then(r => r.json())
      .then(data => {
        setCandidates(data.candidates);
        setTotal(data.total);
        setLoading(false);
      });
  }, [page, search, statusFilter, sourceFilter, sortBy, sortOrder]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleStatusChange = async (id: string, status: CandidateStatus) => {
    await fetch(`/api/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchCandidates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
    fetchCandidates();
    setSelectedCandidate(null);
  };

  const handleViewCandidate = async (c: Candidate) => {
    const res = await fetch(`/api/candidates/${c.id}`);
    const full = await res.json();
    setSelectedCandidate(full);
    setRemarkTab(false);
    const [actRes, remRes] = await Promise.all([
      fetch(`/api/candidates/${c.id}?activity=true`),
      fetch(`/api/remarks?candidate_id=${c.id}`),
    ]);
    setActivityLog(await actRes.json());
    setRemarks(await remRes.json());
  };

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ export: 'csv' });
    if (search) params.set('search', search);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (sourceFilter !== 'All') params.set('source', sourceFilter);
    window.open(`/api/candidates?${params}`, '_blank');
  };

  const handleSendEmail = async (candidateId: string, type: string) => {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_type: type, candidate_id: candidateId }),
    });
    setEmailPreview(await res.json());
  };

  const handleSaveEdit = async () => {
    if (!editCandidate) return;
    await fetch(`/api/candidates/${editCandidate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCandidate),
    });
    setEditCandidate(null);
    fetchCandidates();
  };

  const handleAddCandidate = async () => {
    await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCandidate),
    });
    setAddModal(false);
    setNewCandidate({ status: 'New', source: 'Manual' });
    fetchCandidates();
  };

  const handleAddRemark = async () => {
    if (!selectedCandidate || !newRemark.author_name || !newRemark.comment) return;
    await fetch('/api/remarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRemark, candidate_id: selectedCandidate.id }),
    });
    setNewRemark({ author_name: '', comment: '', rating: 0, stage: '' });
    const res = await fetch(`/api/remarks?candidate_id=${selectedCandidate.id}`);
    setRemarks(await res.json());
  };

  const handleDeleteRemark = async (remarkId: string) => {
    if (!selectedCandidate) return;
    await fetch(`/api/remarks?id=${remarkId}`, { method: 'DELETE' });
    const res = await fetch(`/api/remarks?candidate_id=${selectedCandidate.id}`);
    setRemarks(await res.json());
  };

  const openResume = (c: Candidate) => {
    if (!c.resume_file) return;
    const filename = c.resume_file.replace('/uploads/', '');
    setResumeModal({ url: `/api/resume/${filename}`, filename: c.resume_filename || filename });
  };

  const copyPortalLink = (c: Candidate) => {
    const link = `${window.location.origin}/portal?token=${c.portal_token}`;
    navigator.clipboard.writeText(link);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Candidates</h1>
          <p className="text-text-secondary text-sm mt-1">{total} total candidates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddModal(true)} className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Candidate
          </button>
          <button onClick={handleExport} className="border border-navy text-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy hover:text-white transition-colors flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-whn-border p-4 mb-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search candidates by name, email, phone, employer, designation..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-whn-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-whn-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            className="border border-whn-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold">
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-lg border ${showFilters ? 'border-gold bg-gold/10 text-navy' : 'border-whn-border text-gray-400 hover:text-navy'}`}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-whn-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm candidate-table">
            <thead>
              <tr className="bg-gray-50 border-b border-whn-border">
                {[
                  { key: 'full_name', label: 'Name' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' },
                  { key: 'current_location', label: 'Location' },
                  { key: 'current_employer', label: 'Employer' },
                  { key: 'current_designation', label: 'Designation' },
                  { key: 'current_ctc', label: 'CTC' },
                  { key: 'notice_period', label: 'Notice' },
                  { key: 'source', label: 'Source' },
                  { key: 'status', label: 'Status' },
                  { key: 'date_added', label: 'Added' },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className="text-left px-3 py-3 text-text-secondary font-medium cursor-pointer hover:text-navy whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown size={12} className={sortBy === col.key ? 'text-gold' : 'opacity-30'} />
                    </span>
                  </th>
                ))}
                <th className="text-left px-3 py-3 text-text-secondary font-medium">Resume</th>
                <th className="text-left px-3 py-3 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-whn-border">
                    {[...Array(13)].map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : candidates.length > 0 ? (
                candidates.map(c => (
                  <tr key={c.id} className="border-t border-whn-border hover:bg-blue-50/30">
                    <td className="px-3 py-3">
                      <button onClick={() => handleViewCandidate(c)} className="font-medium text-navy hover:text-navy-light text-left">
                        {c.full_name || 'Unnamed'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-text-secondary whitespace-nowrap">{c.phone || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary truncate max-w-[180px]">{c.email || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary">{c.current_location || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary truncate max-w-[150px]">{c.current_employer || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary truncate max-w-[150px]">{c.current_designation || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary whitespace-nowrap">{c.current_ctc || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary whitespace-nowrap">{c.notice_period || '-'}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">{c.source}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} onChange={s => handleStatusChange(c.id, s)} />
                    </td>
                    <td className="px-3 py-3 text-text-secondary text-xs whitespace-nowrap">
                      {c.date_added ? format(new Date(c.date_added), 'dd MMM yy') : '-'}
                    </td>
                    <td className="px-3 py-3">
                      {c.resume_file ? (
                        <button onClick={() => openResume(c)} className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50" title="View Resume">
                          <FileText size={14} />
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleViewCandidate(c)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title="View"><Eye size={14} /></button>
                        <button onClick={() => setEditCandidate(c)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => setEmailModal({ candidate: c, type: 'interest_check' })} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title="Email"><Mail size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center text-text-secondary">
                    <Search size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">No candidates found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or upload new resumes</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-whn-border">
            <p className="text-sm text-text-secondary">Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-whn-border hover:bg-gray-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = i + 1;
                return <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded-lg text-sm ${page === p ? 'bg-navy text-white' : 'border border-whn-border hover:bg-gray-50'}`}>{p}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-whn-border hover:bg-gray-50 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── View Candidate Modal ── */}
      <Modal open={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} title="Candidate Profile" size="xl">
        {selectedCandidate && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-navy">{selectedCandidate.full_name || 'Unnamed Candidate'}</h3>
                <p className="text-text-secondary">{selectedCandidate.current_designation} {selectedCandidate.current_employer ? `at ${selectedCandidate.current_employer}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedCandidate.status} onChange={s => {
                  handleStatusChange(selectedCandidate.id, s);
                  setSelectedCandidate({ ...selectedCandidate, status: s });
                }} />
              </div>
            </div>

            {/* Profile / Remarks tab toggle */}
            <div className="flex border-b border-whn-border">
              <button onClick={() => setRemarkTab(false)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!remarkTab ? 'border-gold text-navy' : 'border-transparent text-text-secondary hover:text-navy'}`}>
                Profile
              </button>
              <button onClick={() => setRemarkTab(true)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${remarkTab ? 'border-gold text-navy' : 'border-transparent text-text-secondary hover:text-navy'}`}>
                <MessageSquare size={14} /> Remarks & Feedback {remarks.length > 0 && <span className="bg-gold text-navy-dark text-xs rounded-full px-1.5">{remarks.length}</span>}
              </button>
            </div>

            {!remarkTab ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Phone, label: 'Phone', value: selectedCandidate.phone },
                    { icon: Mail, label: 'Email', value: selectedCandidate.email },
                    { icon: MapPin, label: 'Location', value: selectedCandidate.current_location },
                    { icon: Building2, label: 'Current Employer', value: selectedCandidate.current_employer },
                    { icon: Briefcase, label: 'Designation', value: selectedCandidate.current_designation },
                    { icon: Building2, label: 'Previous Employer', value: selectedCandidate.previous_employer },
                    { icon: Briefcase, label: 'Previous Designation', value: selectedCandidate.previous_designation },
                    { icon: Clock, label: 'Notice Period', value: selectedCandidate.notice_period },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <item.icon size={16} className="text-text-secondary mt-0.5 shrink-0" />
                      <div><p className="text-xs text-text-secondary">{item.label}</p><p className="text-sm font-medium text-navy">{item.value || '-'}</p></div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Current CTC', value: selectedCandidate.current_ctc },
                    { label: 'Expected CTC', value: selectedCandidate.expected_ctc },
                    { label: 'Source', value: selectedCandidate.source },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">{item.label}</p>
                      <p className="text-sm font-medium text-navy">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'DOB', value: selectedCandidate.date_of_birth },
                    { label: 'Hometown', value: selectedCandidate.hometown },
                    { label: 'Preferred Cities', value: selectedCandidate.preferred_cities },
                    { label: 'Family Background', value: selectedCandidate.family_background },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">{item.label}</p>
                      <p className="text-sm font-medium text-navy">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>

                {/* Resume */}
                {selectedCandidate.resume_filename && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">{selectedCandidate.resume_filename}</p>
                        <p className="text-xs text-blue-600">Original resume file</p>
                      </div>
                    </div>
                    <button onClick={() => openResume(selectedCandidate)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                      <Eye size={12} /> View Resume
                    </button>
                  </div>
                )}

                {/* Portal Link */}
                {selectedCandidate.portal_token && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Candidate Self-Service Portal</p>
                      <p className="text-xs text-purple-500 mt-0.5">Share this link for the candidate to review & update their profile</p>
                    </div>
                    <button onClick={() => copyPortalLink(selectedCandidate)}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center gap-1">
                      <Copy size={12} /> Copy Link
                    </button>
                  </div>
                )}

                {/* Email Actions */}
                <div>
                  <h4 className="font-semibold text-navy mb-3">Quick Email Actions</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { type: 'missing_info', label: 'Request Missing Info', cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                      { type: 'interest_check', label: 'Check Interest', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                      { type: 'interview_schedule', label: 'Schedule Interview', cls: 'bg-green-50 text-green-700 hover:bg-green-100' },
                      { type: 'vacancy_alert', label: 'Send Vacancy Alert', cls: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                    ].map(t => (
                      <button key={t.type} onClick={() => handleSendEmail(selectedCandidate.id, t.type)}
                        className={`${t.cls} px-3 py-1.5 rounded-lg text-sm font-medium`}>{t.label}</button>
                    ))}
                  </div>
                </div>

                {/* Activity Log */}
                {activityLog.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-navy mb-3">Activity Log</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {activityLog.map(log => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-gold shrink-0" />
                          <div>
                            <span className="font-medium text-navy">{log.action}</span>
                            <span className="text-text-secondary ml-2">{log.details}</span>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {format(new Date(log.timestamp), 'dd MMM yyyy, hh:mm a')} by {log.performed_by}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.notes && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Notes</p>
                    <p className="text-sm text-yellow-900">{selectedCandidate.notes}</p>
                  </div>
                )}

                {selectedCandidate.referrer_name && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600">Referred by</p>
                    <p className="text-sm font-medium text-purple-900">{selectedCandidate.referrer_name} {selectedCandidate.referrer_email ? `(${selectedCandidate.referrer_email})` : ''}</p>
                  </div>
                )}
              </>
            ) : (
              /* ── Remarks Tab ── */
              <div className="space-y-4">
                {/* Add remark form */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-navy text-sm">Add Remark / Feedback</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-secondary font-medium">Your Name *</label>
                      <input type="text" value={newRemark.author_name} onChange={e => setNewRemark({ ...newRemark, author_name: e.target.value })}
                        placeholder="e.g. Rajesh Kumar" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary font-medium">Stage</label>
                      <select value={newRemark.stage} onChange={e => setNewRemark({ ...newRemark, stage: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                        <option value="">Select stage</option>
                        <option>Screening</option>
                        <option>Phone Interview</option>
                        <option>Technical Round</option>
                        <option>HR Round</option>
                        <option>Final Round</option>
                        <option>Offer Stage</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary font-medium">Rating</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(r => (
                        <button key={r} onClick={() => setNewRemark({ ...newRemark, rating: r })}
                          className={`p-1 ${newRemark.rating >= r ? 'text-gold' : 'text-gray-300'}`}>
                          <Star size={20} fill={newRemark.rating >= r ? '#FFD100' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary font-medium">Comment *</label>
                    <textarea value={newRemark.comment} onChange={e => setNewRemark({ ...newRemark, comment: e.target.value })}
                      placeholder="Your feedback about this candidate..."
                      className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold min-h-[80px]" />
                  </div>
                  <button onClick={handleAddRemark} disabled={!newRemark.author_name || !newRemark.comment}
                    className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50">
                    Add Remark
                  </button>
                </div>

                {/* Existing remarks */}
                {remarks.length > 0 ? (
                  <div className="space-y-3">
                    {remarks.map(r => (
                      <div key={r.id} className="bg-white border border-whn-border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center text-sm font-bold text-navy">
                              {r.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-navy">{r.author_name}</p>
                              <p className="text-xs text-text-secondary">
                                {r.stage && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">{r.stage}</span>}
                                {format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.rating > 0 && (
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={14} className={r.rating >= s ? 'text-gold' : 'text-gray-200'} fill={r.rating >= s ? '#FFD100' : 'none'} />
                                ))}
                              </div>
                            )}
                            <button onClick={() => handleDeleteRemark(r.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p className="text-sm text-navy mt-2 leading-relaxed">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No remarks yet. Add the first feedback above.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Resume Viewer Modal ── */}
      <Modal open={!!resumeModal} onClose={() => setResumeModal(null)} title={resumeModal?.filename || 'Resume'} size="xl">
        {resumeModal && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-2">
              <a href={resumeModal.url} target="_blank" rel="noopener noreferrer"
                className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-navy-light flex items-center gap-1">
                <ExternalLink size={12} /> Open in New Tab
              </a>
              <a href={resumeModal.url} download={resumeModal.filename}
                className="border border-navy text-navy px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-navy hover:text-white flex items-center gap-1">
                <Download size={12} /> Download
              </a>
            </div>
            {resumeModal.filename.toLowerCase().endsWith('.pdf') ? (
              <iframe src={resumeModal.url} className="w-full h-[70vh] rounded-lg border border-whn-border" />
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-whn-border">
                <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-text-secondary">Preview not available for this file type.</p>
                <p className="text-xs text-text-secondary mt-1">Use the buttons above to open or download.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Edit Candidate Modal ── */}
      <Modal open={!!editCandidate} onClose={() => setEditCandidate(null)} title="Edit Candidate" size="lg">
        {editCandidate && (
          <div className="space-y-4">
            {[
              { key: 'full_name', label: 'Full Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
              { key: 'current_location', label: 'Current Location' }, { key: 'current_employer', label: 'Current Employer' },
              { key: 'current_designation', label: 'Current Designation' }, { key: 'previous_employer', label: 'Previous Employer' },
              { key: 'previous_designation', label: 'Previous Designation' }, { key: 'date_of_birth', label: 'Date of Birth' },
              { key: 'preferred_cities', label: 'Preferred Cities' }, { key: 'hometown', label: 'Hometown' },
              { key: 'notice_period', label: 'Notice Period' }, { key: 'current_ctc', label: 'Current CTC' },
              { key: 'expected_ctc', label: 'Expected CTC' }, { key: 'family_background', label: 'Family Background' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-sm text-text-secondary font-medium">{field.label}</label>
                <input type="text" value={(editCandidate as unknown as Record<string, string>)[field.key] || ''}
                  onChange={e => setEditCandidate({ ...editCandidate, [field.key]: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold" />
              </div>
            ))}
            <div>
              <label className="text-sm text-text-secondary font-medium">Notes</label>
              <textarea value={editCandidate.notes || ''} onChange={e => setEditCandidate({ ...editCandidate, notes: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold min-h-[80px]" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveEdit} className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark">Save Changes</button>
              <button onClick={() => setEditCandidate(null)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Candidate Modal ── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Candidate" size="lg">
        <div className="space-y-4">
          {[
            { key: 'full_name', label: 'Full Name *' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
            { key: 'current_location', label: 'Current Location' }, { key: 'current_employer', label: 'Current Employer' },
            { key: 'current_designation', label: 'Current Designation' }, { key: 'notice_period', label: 'Notice Period' },
            { key: 'current_ctc', label: 'Current CTC' }, { key: 'expected_ctc', label: 'Expected CTC' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm text-text-secondary font-medium">{field.label}</label>
              <input type="text" value={(newCandidate as Record<string, string>)[field.key] || ''}
                onChange={e => setNewCandidate({ ...newCandidate, [field.key]: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold" />
            </div>
          ))}
          <div>
            <label className="text-sm text-text-secondary font-medium">Source</label>
            <select value={newCandidate.source || 'Manual'} onChange={e => setNewCandidate({ ...newCandidate, source: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
              {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAddCandidate} className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark">Add Candidate</button>
            <button onClick={() => setAddModal(false)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ── Email Preview Modal ── */}
      <Modal open={!!emailPreview} onClose={() => setEmailPreview(null)} title="Email Preview" size="lg">
        {emailPreview && (
          <div className="space-y-4">
            <div><label className="text-xs text-text-secondary font-medium">To</label><p className="text-sm text-navy">{emailPreview.to || 'No email on file'}</p></div>
            <div><label className="text-xs text-text-secondary font-medium">Subject</label><p className="text-sm font-medium text-navy">{emailPreview.subject}</p></div>
            <div>
              <label className="text-xs text-text-secondary font-medium">Body</label>
              <pre className="text-sm text-navy whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-whn-border mt-1 font-sans">{emailPreview.body}</pre>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { if (emailPreview.to) window.open(`mailto:${emailPreview.to}?subject=${encodeURIComponent(emailPreview.subject)}&body=${encodeURIComponent(emailPreview.body)}`); setEmailPreview(null); }}
                className="bg-navy text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-navy-light">Open in Email Client</button>
              <button onClick={() => { navigator.clipboard.writeText(`Subject: ${emailPreview.subject}\n\n${emailPreview.body}`); setEmailPreview(null); }}
                className="border border-navy text-navy px-6 py-2 rounded-lg text-sm font-semibold hover:bg-navy hover:text-white">Copy to Clipboard</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Email Action Selector Modal ── */}
      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title="Send Email" size="sm">
        {emailModal && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-4">Choose an email template for <strong>{emailModal.candidate.full_name}</strong>:</p>
            {[
              { type: 'missing_info', label: 'Request Missing Info', desc: 'Ask candidate to complete their profile' },
              { type: 'interest_check', label: 'Check Interest', desc: 'Confirm if candidate is open to opportunities' },
              { type: 'interview_schedule', label: 'Schedule Interview', desc: 'Send interview invitation with details' },
              { type: 'vacancy_alert', label: 'Vacancy Alert', desc: 'Notify about new openings + referral CTA' },
            ].map(t => (
              <button key={t.type} onClick={() => { handleSendEmail(emailModal.candidate.id, t.type); setEmailModal(null); }}
                className="w-full text-left p-3 rounded-lg border border-whn-border hover:bg-gray-50 transition-colors">
                <p className="text-sm font-semibold text-navy">{t.label}</p>
                <p className="text-xs text-text-secondary">{t.desc}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
