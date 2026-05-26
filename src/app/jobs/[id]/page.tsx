'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Job, Candidate, Department, Interview } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, MapPin, DollarSign, Users, Calendar,
  Edit, Trash2, Plus, Loader2, Save, Clock, UserPlus, Building2
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Normal: 'bg-blue-50 text-blue-700',
  High: 'bg-orange-50 text-orange-700',
  Urgent: 'bg-red-50 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-green-50 text-green-700',
  'On Hold': 'bg-yellow-50 text-yellow-700',
  Closed: 'bg-gray-100 text-gray-600',
  Filled: 'bg-purple-50 text-purple-700',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<(Candidate & { applied_at: string; application_status: string })[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [saving, setSaving] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchJob = () => {
    Promise.all([
      fetch(`/api/jobs/${id}`).then(r => r.json()),
      fetch(`/api/jobs/${id}/candidates`).then(r => r.ok ? r.json() : []),
      fetch(`/api/interviews?job_id=${id}`).then(r => r.ok ? r.json() : []),
      fetch('/api/departments').then(r => r.json()),
    ]).then(([j, c, i, d]) => {
      setJob(j);
      setCandidates(c);
      setInterviews(i);
      setDepartments(d);
      setEditForm(j);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchJob(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    fetchJob();
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job? This will also remove all candidate links.')) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    router.push('/jobs');
  };

  const searchCandidates = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/candidates?search=${encodeURIComponent(q)}&per_page=10`);
    const data = await res.json();
    setSearchResults(data.candidates || []);
    setSearching(false);
  };

  const linkCandidate = async (candidateId: string) => {
    await fetch(`/api/jobs/${id}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    setLinkModal(false);
    setSearchQuery('');
    setSearchResults([]);
    fetchJob();
  };

  const unlinkCandidate = async (candidateId: string) => {
    if (!confirm('Remove this candidate from the job?')) return;
    await fetch(`/api/jobs/${id}/candidates`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    fetchJob();
  };

  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );

  if (!job) return (
    <div className="p-8 text-center">
      <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-text-secondary">Job not found</p>
      <Link href="/jobs" className="text-navy text-sm font-medium mt-2 inline-block">Back to Jobs</Link>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/jobs" className="text-text-secondary hover:text-navy"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
            {job.department_name && <span className="flex items-center gap-1"><Building2 size={14} /> {job.department_name}</span>}
            {job.warehouse_site && <span className="flex items-center gap-1"><MapPin size={14} /> {job.warehouse_site}</span>}
            <span className="flex items-center gap-1"><Users size={14} /> {job.num_positions} positions</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-light">
            <Edit size={14} /> Edit
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1 text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-whn-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[job.status] || ''}`}>{job.status}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${PRIORITY_COLORS[job.priority] || ''}`}>{job.priority} Priority</span>
              {job.posted_by_name && <span className="text-xs text-text-secondary">Posted by {job.posted_by_name}</span>}
            </div>
            {(job.expected_salary_min || job.expected_salary_max) && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <DollarSign size={16} className="text-gold" />
                <span className="text-navy font-medium">
                  {job.expected_salary_min && job.expected_salary_max
                    ? `${job.expected_salary_min} - ${job.expected_salary_max}`
                    : job.expected_salary_min || job.expected_salary_max}
                </span>
              </div>
            )}
            {job.description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-navy mb-2">Description</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
            {job.requirements && (
              <div>
                <h3 className="text-sm font-semibold text-navy mb-2">Requirements</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}
          </div>

          {/* Candidates */}
          <div className="bg-white rounded-xl border border-whn-border">
            <div className="px-5 py-3 border-b border-whn-border flex items-center justify-between">
              <h2 className="font-semibold text-navy flex items-center gap-2 text-sm"><Users size={16} /> Candidates ({candidates.length})</h2>
              <button onClick={() => setLinkModal(true)} className="text-xs bg-gold text-navy-dark px-3 py-1.5 rounded-lg font-semibold hover:bg-gold-dark flex items-center gap-1">
                <Plus size={12} /> Add Candidate
              </button>
            </div>
            {candidates.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Name</th>
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Status</th>
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Applied</th>
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Location</th>
                    <th className="text-right px-4 py-2.5 text-text-secondary font-medium text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.id} className="border-t border-whn-border hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-navy text-sm">{c.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-text-secondary">{c.email}</p>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={c.status} size="xs" /></td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">{new Date(c.applied_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">{c.current_location || '-'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => unlinkCandidate(c.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-text-secondary text-sm">
                <UserPlus size={32} className="mx-auto mb-2 opacity-20" />
                No candidates linked yet. Click &quot;Add Candidate&quot; to link candidates to this job.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-whn-border p-5 space-y-4">
            <h3 className="font-semibold text-navy text-sm">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-navy">{candidates.length}</p>
                <p className="text-[10px] text-text-secondary">Applicants</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-navy">{interviews.length}</p>
                <p className="text-[10px] text-text-secondary">Interviews</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-navy">{job.num_positions}</p>
                <p className="text-[10px] text-text-secondary">Positions</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-navy">{Math.ceil((Date.now() - new Date(job.created_at).getTime()) / 86400000)}d</p>
                <p className="text-[10px] text-text-secondary">Days Open</p>
              </div>
            </div>
          </div>

          {/* Upcoming Interviews */}
          <div className="bg-white rounded-xl border border-whn-border">
            <div className="px-5 py-3 border-b border-whn-border">
              <h3 className="font-semibold text-navy text-sm flex items-center gap-2"><Calendar size={14} /> Interviews</h3>
            </div>
            <div className="p-4">
              {interviews.length > 0 ? interviews.slice(0, 5).map(i => (
                <div key={i.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 bg-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{i.candidate_name}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(i.scheduled_at).toLocaleDateString()} - {i.type}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${i.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                </div>
              )) : (
                <p className="text-sm text-text-secondary text-center py-3">No interviews scheduled</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-whn-border p-5">
            <h3 className="font-semibold text-navy text-sm mb-3 flex items-center gap-2"><Clock size={14} /> Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Created</span>
                <span className="text-navy font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Last Updated</span>
                <span className="text-navy font-medium">{new Date(job.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Job" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary font-medium">Title *</label>
            <input type="text" value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Department</label>
              <select value={editForm.department_id || ''} onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Warehouse Site</label>
              <input type="text" value={editForm.warehouse_site || ''} onChange={e => setEditForm({ ...editForm, warehouse_site: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Positions</label>
              <input type="number" min={1} value={editForm.num_positions || 1} onChange={e => setEditForm({ ...editForm, num_positions: parseInt(e.target.value) || 1 })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Status</label>
              <select value={editForm.status || 'Open'} onChange={e => setEditForm({ ...editForm, status: e.target.value as Job['status'] })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                <option>Open</option><option>On Hold</option><option>Closed</option><option>Filled</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Priority</label>
              <select value={editForm.priority || 'Normal'} onChange={e => setEditForm({ ...editForm, priority: e.target.value as Job['priority'] })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                <option>Low</option><option>Normal</option><option>High</option><option>Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Salary Min</label>
              <input type="text" value={editForm.expected_salary_min || ''} onChange={e => setEditForm({ ...editForm, expected_salary_min: e.target.value })}
                placeholder="e.g. 4 LPA" className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Salary Max</label>
              <input type="text" value={editForm.expected_salary_max || ''} onChange={e => setEditForm({ ...editForm, expected_salary_max: e.target.value })}
                placeholder="e.g. 8 LPA" className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Description</label>
            <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Requirements</label>
            <textarea value={editForm.requirements || ''} onChange={e => setEditForm({ ...editForm, requirements: e.target.value })} rows={3}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button onClick={() => setEditing(false)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Link Candidate Modal */}
      <Modal open={linkModal} onClose={() => { setLinkModal(false); setSearchQuery(''); setSearchResults([]); }} title="Add Candidate to Job" size="md">
        <div className="space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => searchCandidates(e.target.value)}
            placeholder="Search candidates by name, email, phone..."
            className="w-full px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold"
            autoFocus
          />
          {searching && <div className="text-center py-4"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map(c => {
                const alreadyLinked = candidates.some(lc => lc.id === c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-navy">{c.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-text-secondary">{c.email} {c.current_designation && `| ${c.current_designation}`}</p>
                    </div>
                    {alreadyLinked ? (
                      <span className="text-xs text-green-600 font-medium">Already added</span>
                    ) : (
                      <button onClick={() => linkCandidate(c.id)}
                        className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy-light">
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-4">No candidates found</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
