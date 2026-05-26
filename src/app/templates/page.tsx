'use client';

import { useEffect, useState } from 'react';
import { EmailTemplate } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { Mail, Edit, Save, Eye, AlertCircle, Plus, Trash2, Filter } from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  outreach: { label: 'Outreach', color: 'blue' },
  interview: { label: 'Interview', color: 'green' },
  offer: { label: 'Offer', color: 'purple' },
  auto: { label: 'Automated', color: 'amber' },
  general: { label: 'General', color: 'gray' },
};

const TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  missing_info: { label: 'Missing Info Request', desc: 'Auto-detects blank fields and asks candidates to complete their profile' },
  interest_check: { label: 'Interest Confirmation', desc: 'Checks if a candidate is open to opportunities' },
  interview_schedule: { label: 'Interview Scheduling', desc: 'Proposes interview slots with support for panel interviews' },
  vacancy_alert: { label: 'Vacancy Alert + Referral', desc: 'Broadcasts new openings with a built-in referral CTA' },
  acknowledgement: { label: 'Application Received', desc: 'Confirms application receipt' },
  offer: { label: 'Offer Letter', desc: 'Formal employment offer' },
  rejection: { label: 'Rejection Notice', desc: 'Polite rejection with future consideration' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '', type: 'general', category: 'general' });
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchTemplates = () => {
    fetch('/api/email').then(r => r.json()).then(data => { setTemplates(data); setLoading(false); });
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!editTemplate) return;
    setSaving(true);
    const res = await fetch('/api/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTemplate),
    });
    const updated = await res.json();
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditTemplate(null);
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) return;
    setSaving(true);
    const res = await fetch('/api/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newTemplate }),
    });
    if (res.ok) {
      setAddModal(false);
      setNewTemplate({ name: '', subject: '', body: '', type: 'general', category: 'general' });
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await fetch('/api/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchTemplates();
  };

  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => (t.category || 'general') === filterCategory);

  const categories = [...new Set(templates.map(t => t.category || 'general'))];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Email Templates</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Branded email templates for candidate outreach. Edit or create new templates.
          </p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="bg-gold text-navy-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter size={14} className="text-text-secondary" />
        <button onClick={() => setFilterCategory('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterCategory === 'all' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All ({templates.length})
        </button>
        {categories.map(cat => {
          const cfg = CATEGORY_LABELS[cat] || { label: cat, color: 'gray' };
          const count = templates.filter(t => (t.category || 'general') === cat).length;
          return (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterCategory === cat ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Variable Reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Template Variables</p>
          <p className="mt-1">Use these placeholders — they get replaced with actual data when sending:</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {['{{candidate_name}}', '{{missing_fields}}', '{{profile_link}}', '{{confirm_link}}', '{{position}}', '{{interview_date}}', '{{interview_time}}', '{{interview_mode}}', '{{interviewers}}', '{{vacancy_details}}', '{{locations}}', '{{referral_link}}', '{{department}}', '{{location}}', '{{offered_ctc}}', '{{joining_date}}', '{{portal_link}}'].map(v => (
              <code key={v} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{v}</code>
            ))}
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="space-y-4">
        {filteredTemplates.map(template => {
          const typeConfig = TYPE_LABELS[template.type] || { label: template.type, desc: '' };
          const catConfig = CATEGORY_LABELS[template.category || 'general'] || { label: 'General', color: 'gray' };
          return (
            <div key={template.id} className="bg-white rounded-xl border border-whn-border overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${catConfig.color}-100 flex items-center justify-center`}>
                    <Mail size={20} className={`text-${catConfig.color}-600`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-navy">{template.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${catConfig.color}-50 text-${catConfig.color}-700 font-medium`}>
                        {catConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{typeConfig.desc || template.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewTemplate(template)}
                    className="flex items-center gap-1 text-sm text-text-secondary hover:text-navy px-3 py-1.5 rounded-lg border border-whn-border hover:border-navy transition-colors">
                    <Eye size={14} /> Preview
                  </button>
                  <button onClick={() => setEditTemplate({ ...template })}
                    className="flex items-center gap-1 text-sm text-white bg-navy px-3 py-1.5 rounded-lg hover:bg-navy-light transition-colors">
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(template.id)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-whn-border">
                <p className="text-xs text-text-secondary">Subject: <span className="text-navy font-medium">{template.subject}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <Mail size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No templates in this category.</p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editTemplate} onClose={() => setEditTemplate(null)} title="Edit Template" size="lg">
        {editTemplate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary font-medium">Template Name</label>
                <input type="text" value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Category</label>
                <select value={editTemplate.category || 'general'} onChange={e => setEditTemplate({ ...editTemplate, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Subject Line</label>
              <input type="text" value={editTemplate.subject} onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Email Body</label>
              <textarea value={editTemplate.body} onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })} rows={15}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold font-mono" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button onClick={() => setEditTemplate(null)}
                className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Create New Template" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Template Name *</label>
              <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g. Follow-Up Email" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Category</label>
              <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Type Key</label>
            <input type="text" value={newTemplate.type} onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value })}
              placeholder="e.g. follow_up" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
            <p className="text-xs text-text-secondary mt-1">A unique key for this template type (lowercase, underscores)</p>
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Subject Line *</label>
            <input type="text" value={newTemplate.subject} onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })}
              placeholder="Email subject..." className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold" />
          </div>
          <div>
            <label className="text-sm text-text-secondary font-medium">Email Body *</label>
            <textarea value={newTemplate.body} onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })} rows={12}
              placeholder="Dear {{candidate_name}},&#10;&#10;..." className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold font-mono" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={saving || !newTemplate.name || !newTemplate.subject || !newTemplate.body}
              className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
              <Plus size={16} /> {saving ? 'Creating...' : 'Create Template'}
            </button>
            <button onClick={() => setAddModal(false)}
              className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Template Preview" size="lg">
        {previewTemplate && (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-text-secondary mb-1">Subject</p>
              <p className="text-sm font-medium text-navy">{previewTemplate.subject}</p>
            </div>
            <div className="bg-white border border-whn-border rounded-lg p-6">
              <pre className="text-sm text-navy whitespace-pre-wrap font-sans leading-relaxed">
                {previewTemplate.body}
              </pre>
            </div>
            <div className="mt-4 p-3 bg-navy/5 rounded-lg">
              <p className="text-xs text-text-secondary">
                Variables shown as {'{{placeholder}}'} will be replaced with actual candidate data when sending.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
