'use client';

import { useEffect, useState } from 'react';
import { TeamMember, TeamRole, Department, WorkflowRule, EmailTemplate, CandidateStatus } from '@/lib/types';
import { Modal } from '@/components/Modal';
import {
  Settings, Users, Mail, Key, Globe, Database,
  Shield, Bell, CheckCircle, Plus, Edit, Trash2, UserPlus, Loader2,
  Building2, Zap, ArrowRight
} from 'lucide-react';

const ROLES: { role: TeamRole; icon: typeof Shield; perms: string }[] = [
  { role: 'Admin', icon: Shield, perms: 'Full access - manage users, settings, all candidates' },
  { role: 'Recruiter', icon: Users, perms: 'Add/edit candidates, send emails, schedule interviews' },
  { role: 'Hiring Manager', icon: Key, perms: 'View assigned candidates, leave feedback, rate interviews' },
  { role: 'Viewer', icon: Bell, perms: 'Read-only access to candidate profiles and reports' },
];

const ALL_STATUSES: CandidateStatus[] = ['New', 'Contacted', 'Screening', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'On Hold'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: 'Recruiter' as TeamRole, phone: '', department: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [addDeptModal, setAddDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '', head: '' });
  // Workflow Rules
  const [rules, setRules] = useState<(WorkflowRule & { template_name?: string })[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [addRuleModal, setAddRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ from_status: 'New', to_status: 'Contacted', template_id: '', is_active: true });

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  // Team fetch
  const fetchTeam = () => {
    setLoadingTeam(true);
    fetch('/api/team').then(r => r.json()).then(data => { setTeamMembers(data); setLoadingTeam(false); }).catch(() => setLoadingTeam(false));
  };

  // Department fetch
  const fetchDepts = () => {
    setLoadingDepts(true);
    fetch('/api/departments').then(r => r.json()).then(data => { setDepartments(data); setLoadingDepts(false); }).catch(() => setLoadingDepts(false));
  };

  // Workflow fetch
  const fetchRules = () => {
    setLoadingRules(true);
    Promise.all([
      fetch('/api/workflow-rules').then(r => r.json()),
      fetch('/api/email').then(r => r.json()),
    ]).then(([r, t]) => {
      setRules(r);
      setTemplates(t);
      setLoadingRules(false);
    }).catch(() => setLoadingRules(false));
  };

  useEffect(() => {
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'departments') fetchDepts();
    if (activeTab === 'workflow') fetchRules();
  }, [activeTab]);

  // Team handlers
  const handleAddMember = async () => {
    if (!memberForm.name || !memberForm.email) { setFormError('Name and email are required'); return; }
    setSaving(true); setFormError('');
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memberForm) });
    if (!res.ok) { const err = await res.json(); setFormError(err.error || 'Failed'); setSaving(false); return; }
    setAddMemberModal(false);
    setMemberForm({ name: '', email: '', role: 'Recruiter', phone: '', department: '' });
    setSaving(false); fetchTeam();
  };

  const handleUpdateMember = async () => {
    if (!editMember) return;
    setSaving(true);
    await fetch(`/api/team/${editMember.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editMember) });
    setEditMember(null); setSaving(false); fetchTeam();
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await fetch(`/api/team/${id}`, { method: 'DELETE' }); fetchTeam();
  };

  const handleToggleActive = async (m: TeamMember) => {
    await fetch(`/api/team/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !m.is_active }) });
    fetchTeam();
  };

  // Department handlers
  const handleAddDept = async () => {
    if (!deptForm.name) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    await fetch('/api/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...deptForm, is_active: true }) });
    setAddDeptModal(false); setDeptForm({ name: '', description: '', head: '' }); setSaving(false); fetchDepts();
  };

  const handleUpdateDept = async () => {
    if (!editDept) return;
    setSaving(true);
    await fetch(`/api/departments/${editDept.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editDept) });
    setEditDept(null); setSaving(false); fetchDepts();
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    await fetch(`/api/departments/${id}`, { method: 'DELETE' }); fetchDepts();
  };

  // Workflow handlers
  const handleAddRule = async () => {
    if (!ruleForm.template_id) { setFormError('Please select an email template'); return; }
    setSaving(true); setFormError('');
    await fetch('/api/workflow-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleForm) });
    setAddRuleModal(false); setRuleForm({ from_status: 'New', to_status: 'Contacted', template_id: '', is_active: true }); setSaving(false); fetchRules();
  };

  const handleToggleRule = async (rule: WorkflowRule) => {
    await fetch(`/api/workflow-rules/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !rule.is_active }) });
    fetchRules();
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this workflow rule?')) return;
    await fetch(`/api/workflow-rules/${id}`, { method: 'DELETE' }); fetchRules();
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'team', label: 'Team & Roles', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'workflow', label: 'Workflow Rules', icon: Zap },
    { id: 'email', label: 'Email Setup', icon: Mail },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  const roleColor = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-red-50 text-red-700', Recruiter: 'bg-blue-50 text-blue-700',
      'Hiring Manager': 'bg-green-50 text-green-700', Viewer: 'bg-gray-100 text-gray-600',
    };
    return colors[role] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your ATS platform</p>
      </div>

      {saved && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-slide-in z-50">
          <CheckCircle size={16} /> Settings saved
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-48 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeTab === tab.id ? 'bg-gold text-navy-dark' : 'text-text-secondary hover:bg-gray-100 hover:text-navy'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-xl border border-whn-border p-6 max-w-3xl">
          {/* ─── General ─── */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-navy text-lg">General Settings</h2>
              <div>
                <label className="text-sm text-text-secondary font-medium">Company Name</label>
                <input type="text" defaultValue="Warehouse Now" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Default Candidate Status</label>
                <select className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                  <option>New</option><option>Contacted</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Candidates Per Page</label>
                <select className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                  <option>25</option><option>50</option><option>100</option>
                </select>
              </div>
              <button onClick={showSaved} className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark">Save Settings</button>
            </div>
          )}

          {/* ─── Team ─── */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-navy text-lg">Team Members</h2>
                  <p className="text-sm text-text-secondary">Manage your hiring team and their access roles.</p>
                </div>
                <button onClick={() => { setAddMemberModal(true); setFormError(''); }}
                  className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2">
                  <UserPlus size={16} /> Add Member
                </button>
              </div>

              <div className="border border-whn-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Role</th>
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium text-xs">Permissions</th>
                  </tr></thead>
                  <tbody>
                    {ROLES.map(r => (
                      <tr key={r.role} className="border-t border-whn-border">
                        <td className="px-4 py-2.5 font-medium text-navy flex items-center gap-2 text-xs"><r.icon size={12} /> {r.role}</td>
                        <td className="px-4 py-2.5 text-text-secondary text-xs">{r.perms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {loadingTeam ? (
                <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-4 border rounded-lg ${m.is_active ? 'border-whn-border' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center text-sm font-bold text-navy">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-navy text-sm">{m.name} {!m.is_active && <span className="text-xs text-gray-400">(inactive)</span>}</p>
                          <p className="text-xs text-text-secondary">{m.email} {m.department && `- ${m.department}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColor(m.role)}`}>{m.role}</span>
                        <button onClick={() => setEditMember({ ...m })} className="text-gray-400 hover:text-navy p-1"><Edit size={14} /></button>
                        <button onClick={() => handleToggleActive(m)} className="text-gray-400 hover:text-navy p-1" title={m.is_active ? 'Deactivate' : 'Activate'}>
                          {m.is_active ? <Bell size={14} /> : <CheckCircle size={14} />}
                        </button>
                        <button onClick={() => handleDeleteMember(m.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  <Users size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No team members added yet.</p>
                  <p className="text-xs mt-1">Click &quot;Add Member&quot; to invite your hiring team.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Departments ─── */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-navy text-lg">Departments</h2>
                  <p className="text-sm text-text-secondary">Manage company departments for candidate allocation.</p>
                </div>
                <button onClick={() => { setAddDeptModal(true); setFormError(''); setDeptForm({ name: '', description: '', head: '' }); }}
                  className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2">
                  <Plus size={16} /> Add Department
                </button>
              </div>

              {loadingDepts ? (
                <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
              ) : departments.length > 0 ? (
                <div className="space-y-3">
                  {departments.map(d => (
                    <div key={d.id} className={`flex items-center justify-between p-4 border rounded-lg ${d.is_active ? 'border-whn-border' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/5 rounded-lg flex items-center justify-center">
                          <Building2 size={18} className="text-navy" />
                        </div>
                        <div>
                          <p className="font-medium text-navy text-sm">{d.name} {!d.is_active && <span className="text-xs text-gray-400">(inactive)</span>}</p>
                          <p className="text-xs text-text-secondary">
                            {d.head ? `Head: ${d.head}` : 'No head assigned'}
                            {d.description ? ` | ${d.description}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditDept({ ...d })} className="text-gray-400 hover:text-navy p-1"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteDept(d.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No departments created yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Workflow Rules ─── */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-navy text-lg">Workflow Automation</h2>
                  <p className="text-sm text-text-secondary">Auto-send emails when candidate status changes.</p>
                </div>
                <button onClick={() => { setAddRuleModal(true); setFormError(''); }}
                  className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2">
                  <Plus size={16} /> Add Rule
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">How it works</p>
                <p>When a candidate&apos;s status changes from one stage to another, the system automatically sends the linked email template. For example: New → Contacted triggers an Interest Confirmation email.</p>
              </div>

              {loadingRules ? (
                <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
              ) : rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map(r => (
                    <div key={r.id} className={`flex items-center justify-between p-4 border rounded-lg ${r.is_active ? 'border-whn-border' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="bg-navy/10 text-navy px-2.5 py-1 rounded-full text-xs font-medium">{r.from_status}</span>
                          <ArrowRight size={14} className="text-text-secondary" />
                          <span className="bg-gold/20 text-navy-dark px-2.5 py-1 rounded-full text-xs font-medium">{r.to_status}</span>
                        </div>
                        <span className="text-xs text-text-secondary">sends &quot;{r.template_name || 'Unknown template'}&quot;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleRule(r)}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${r.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => handleDeleteRule(r.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  <Zap size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No workflow rules configured.</p>
                  <p className="text-xs mt-1">Add rules to auto-send emails on status changes.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Email ─── */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-navy text-lg">Email Configuration</h2>
              <div>
                <label className="text-sm text-text-secondary font-medium">SMTP Host</label>
                <input type="text" placeholder="smtp.gmail.com" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary font-medium">SMTP Port</label>
                  <input type="number" placeholder="587" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary font-medium">Encryption</label>
                  <select className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                    <option>TLS</option><option>SSL</option><option>None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">From Email</label>
                <input type="email" placeholder="HR@warehousenow.in" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Resume Forwarding Address</label>
                <input type="email" defaultValue="resumes@warehousenow.in" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" readOnly />
                <p className="text-xs text-text-secondary mt-1">Resumes forwarded to this address will be auto-parsed.</p>
              </div>
              <button onClick={showSaved} className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark">Save Email Settings</button>
            </div>
          )}

          {/* ─── Integrations ─── */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-navy text-lg">Job Portal Integrations</h2>
              <p className="text-sm text-text-secondary">Connect your employer accounts to auto-sync candidate applications.</p>
              {[
                { name: 'Naukri.com', status: 'Not Connected', desc: "India's #1 job portal" },
                { name: 'Indeed', status: 'Not Connected', desc: 'Global job search engine' },
                { name: 'iimjobs.com', status: 'Not Connected', desc: 'Premium jobs for management professionals' },
                { name: 'LinkedIn', status: 'Coming Soon', desc: 'Professional network' },
                { name: 'Apna', status: 'Coming Soon', desc: 'Blue-collar & grey-collar jobs' },
                { name: 'WorkIndia', status: 'Coming Soon', desc: 'Blue-collar hiring platform' },
                { name: 'Google Calendar', status: 'Not Connected', desc: 'For interview scheduling' },
                { name: 'Outlook Calendar', status: 'Not Connected', desc: 'For interview scheduling' },
              ].map(i => (
                <div key={i.name} className="flex items-center justify-between p-4 border border-whn-border rounded-lg">
                  <div><p className="font-medium text-navy text-sm">{i.name}</p><p className="text-xs text-text-secondary">{i.desc}</p></div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${i.status === 'Coming Soon' ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-600'}`}>{i.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ─── Data ─── */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-navy text-lg">Data Management</h2>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">Database</p>
                <p className="text-xs text-blue-600 mt-1">SQLite database at data/ats.db</p>
              </div>
              <div>
                <h3 className="font-medium text-navy text-sm mb-2">Export</h3>
                <a href="/api/candidates?export=csv"
                  className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-light">
                  <Database size={16} /> Export All Candidates to CSV
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}

      {/* Add Member Modal */}
      <Modal open={addMemberModal} onClose={() => setAddMemberModal(false)} title="Add Team Member" size="md">
        <div className="space-y-4">
          {formError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>}
          <div>
            <label className="text-sm text-text-secondary font-medium">Name *</label>
            <input type="text" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
              placeholder="Full name" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Email *</label>
            <input type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
              placeholder="email@warehousenow.in" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Role *</label>
              <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value as TeamRole })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                <option>Admin</option><option>Recruiter</option><option>Hiring Manager</option><option>Viewer</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Phone</label>
              <input type="tel" value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                placeholder="+91..." className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Department</label>
            <input type="text" value={memberForm.department} onChange={e => setMemberForm({ ...memberForm, department: e.target.value })}
              placeholder="e.g. Operations, HR" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAddMember} disabled={saving}
              className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Member
            </button>
            <button onClick={() => setAddMemberModal(false)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Team Member" size="md">
        {editMember && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Name</label>
              <input type="text" value={editMember.name} onChange={e => setEditMember({ ...editMember, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Email</label>
              <input type="email" value={editMember.email} onChange={e => setEditMember({ ...editMember, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary font-medium">Role</label>
                <select value={editMember.role} onChange={e => setEditMember({ ...editMember, role: e.target.value as TeamRole })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                  <option>Admin</option><option>Recruiter</option><option>Hiring Manager</option><option>Viewer</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Phone</label>
                <input type="tel" value={editMember.phone || ''} onChange={e => setEditMember({ ...editMember, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Department</label>
              <input type="text" value={editMember.department || ''} onChange={e => setEditMember({ ...editMember, department: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleUpdateMember} disabled={saving}
                className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditMember(null)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Department Modal */}
      <Modal open={addDeptModal} onClose={() => setAddDeptModal(false)} title="Add Department" size="md">
        <div className="space-y-4">
          {formError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>}
          <div>
            <label className="text-sm text-text-secondary font-medium">Department Name *</label>
            <input type="text" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Warehouse Operations" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Description</label>
            <input type="text" value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Brief description" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Department Head</label>
            <input type="text" value={deptForm.head} onChange={e => setDeptForm({ ...deptForm, head: e.target.value })}
              placeholder="Name of department head" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAddDept} disabled={saving}
              className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Department
            </button>
            <button onClick={() => setAddDeptModal(false)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Department Modal */}
      <Modal open={!!editDept} onClose={() => setEditDept(null)} title="Edit Department" size="md">
        {editDept && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Department Name *</label>
              <input type="text" value={editDept.name} onChange={e => setEditDept({ ...editDept, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Description</label>
              <input type="text" value={editDept.description || ''} onChange={e => setEditDept({ ...editDept, description: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Department Head</label>
              <input type="text" value={editDept.head || ''} onChange={e => setEditDept({ ...editDept, head: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleUpdateDept} disabled={saving}
                className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditDept(null)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Workflow Rule Modal */}
      <Modal open={addRuleModal} onClose={() => setAddRuleModal(false)} title="Add Workflow Rule" size="md">
        <div className="space-y-4">
          {formError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">From Status *</label>
              <select value={ruleForm.from_status} onChange={e => setRuleForm({ ...ruleForm, from_status: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">To Status *</label>
              <select value={ruleForm.to_status} onChange={e => setRuleForm({ ...ruleForm, to_status: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Email Template *</label>
            <select value={ruleForm.template_id} onChange={e => setRuleForm({ ...ruleForm, template_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
              <option value="">Select template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAddRule} disabled={saving}
              className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Add Rule
            </button>
            <button onClick={() => setAddRuleModal(false)} className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
