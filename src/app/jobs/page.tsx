'use client';

import { useState, useEffect } from 'react';
import { Job, Department, TeamMember, JobStatus, JobPriority } from '@/lib/types';
import { Modal } from '@/components/Modal';
import {
  Briefcase, Plus, Search, MapPin, Users, IndianRupee,
  Filter, MoreVertical, Building2, Clock, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const JOB_STATUSES: JobStatus[] = ['Open', 'On Hold', 'Closed', 'Filled'];
const PRIORITIES: JobPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

const statusColors: Record<string, string> = {
  Open: 'bg-green-100 text-green-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-gray-100 text-gray-800',
  Filled: 'bg-blue-100 text-blue-800',
};

const priorityColors: Record<string, string> = {
  Low: 'text-gray-500',
  Normal: 'text-blue-600',
  High: 'text-orange-600',
  Urgent: 'text-red-600',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState({
    title: '', department_id: '', posted_by: '', num_positions: 1,
    warehouse_site: '', expected_salary_min: '', expected_salary_max: '',
    description: '', requirements: '', status: 'Open' as JobStatus, priority: 'Normal' as JobPriority,
  });

  const fetchJobs = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (deptFilter) params.set('department_id', deptFilter);
    fetch(`/api/jobs?${params}`).then(r => r.json()).then(setJobs);
  };

  useEffect(() => { fetchJobs(); }, [search, statusFilter, deptFilter]);
  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(setDepartments);
    fetch('/api/team').then(r => r.json()).then(setTeamMembers);
  }, []);

  const handleCreate = async () => {
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    resetForm();
    fetchJobs();
  };

  const handleUpdate = async () => {
    if (!editJob) return;
    await fetch(`/api/jobs/${editJob.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditJob(null);
    resetForm();
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job requisition?')) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    fetchJobs();
  };

  const resetForm = () => setForm({
    title: '', department_id: '', posted_by: '', num_positions: 1,
    warehouse_site: '', expected_salary_min: '', expected_salary_max: '',
    description: '', requirements: '', status: 'Open', priority: 'Normal',
  });

  const openEdit = (job: Job) => {
    setForm({
      title: job.title, department_id: job.department_id, posted_by: job.posted_by,
      num_positions: job.num_positions, warehouse_site: job.warehouse_site,
      expected_salary_min: job.expected_salary_min, expected_salary_max: job.expected_salary_max,
      description: job.description, requirements: job.requirements,
      status: job.status, priority: job.priority,
    });
    setEditJob(job);
  };

  const openJobs = jobs.filter(j => j.status === 'Open').length;
  const totalPositions = jobs.filter(j => j.status === 'Open').reduce((s, j) => s + j.num_positions, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Briefcase size={24} /> Job Requisitions
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {openJobs} open positions ({totalPositions} total headcount needed)
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }}
          className="bg-gold text-navy-dark px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark flex items-center gap-2">
          <Plus size={16} /> New Job Requisition
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..." className="w-full pl-9 pr-3 py-2.5 border border-whn-border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-whn-border rounded-lg text-sm">
          <option value="All">All Status</option>
          {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 border border-whn-border rounded-lg text-sm">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl border border-whn-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Link href={`/jobs/${job.id}`} className="text-navy font-bold hover:underline text-base">{job.title}</Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[job.status]}`}>{job.status}</span>
                  {job.priority !== 'Normal' && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${priorityColors[job.priority]}`}>
                      <AlertTriangle size={11} />{job.priority}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative group">
                <button className="p-1 rounded hover:bg-gray-100"><MoreVertical size={16} className="text-gray-400" /></button>
                <div className="absolute right-0 top-8 bg-white border border-whn-border rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
                  <button onClick={() => openEdit(job)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(job.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-text-secondary">
              {job.department_name && (
                <div className="flex items-center gap-2"><Building2 size={14} />{job.department_name}</div>
              )}
              {job.warehouse_site && (
                <div className="flex items-center gap-2"><MapPin size={14} />{job.warehouse_site}</div>
              )}
              <div className="flex items-center gap-2">
                <Users size={14} />
                {job.num_positions} position{job.num_positions > 1 ? 's' : ''}
                {job.candidate_count ? ` | ${job.candidate_count} applicant${job.candidate_count > 1 ? 's' : ''}` : ''}
              </div>
              {(job.expected_salary_min || job.expected_salary_max) && (
                <div className="flex items-center gap-2">
                  <IndianRupee size={14} />
                  {job.expected_salary_min && job.expected_salary_max
                    ? `${job.expected_salary_min} - ${job.expected_salary_max}`
                    : job.expected_salary_min || `Up to ${job.expected_salary_max}`}
                </div>
              )}
              {job.posted_by_name && (
                <div className="flex items-center gap-2"><Clock size={14} />Posted by {job.posted_by_name}</div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Created {new Date(job.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-secondary">
            <Briefcase size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No job requisitions found</p>
            <p className="text-sm mt-1">Create your first job requisition to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editJob) && (
        <Modal open={true} title={editJob ? 'Edit Job Requisition' : 'New Job Requisition'} onClose={() => { setShowCreate(false); setEditJob(null); resetForm(); }} size="lg">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Job Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="e.g. Warehouse Manager" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Department</label>
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Posted By</label>
                <select value={form.posted_by} onChange={e => setForm({ ...form, posted_by: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  <option value="">Select team member</option>
                  {teamMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">No. of Positions</label>
                <input type="number" min={1} value={form.num_positions} onChange={e => setForm({ ...form, num_positions: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Warehouse Site</label>
                <input value={form.warehouse_site} onChange={e => setForm({ ...form, warehouse_site: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="e.g. Mumbai, Pune" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as JobPriority })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Expected Salary (Min)</label>
                <input value={form.expected_salary_min} onChange={e => setForm({ ...form, expected_salary_min: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="e.g. 4 LPA" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Expected Salary (Max)</label>
                <input value={form.expected_salary_max} onChange={e => setForm({ ...form, expected_salary_max: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="e.g. 8 LPA" />
              </div>
            </div>
            {editJob && (
              <div>
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as JobStatus })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="Job description..." />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Requirements</label>
              <textarea rows={3} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="Key requirements..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={editJob ? handleUpdate : handleCreate} disabled={!form.title}
                className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50">
                {editJob ? 'Update' : 'Create'} Job
              </button>
              <button onClick={() => { setShowCreate(false); setEditJob(null); resetForm(); }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium border border-whn-border hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
