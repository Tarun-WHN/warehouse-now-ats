'use client';

import { useEffect, useState } from 'react';
import { EmailTemplate } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { Mail, Edit, Save, Eye, AlertCircle } from 'lucide-react';

const TYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  missing_info: { label: 'Missing Info Request', color: 'amber', desc: 'Auto-detects blank fields and asks candidates to complete their profile' },
  interest_check: { label: 'Interest Confirmation', color: 'blue', desc: 'Checks if a candidate is open to opportunities at Warehouse Now' },
  interview_schedule: { label: 'Interview Scheduling', color: 'green', desc: 'Proposes interview slots with support for panel interviews' },
  vacancy_alert: { label: 'Vacancy Alert + Referral', color: 'purple', desc: 'Broadcasts new openings with a built-in referral CTA' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/email')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false); });
  }, []);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Email Templates</h1>
        <p className="text-text-secondary mt-1">
          Branded email templates for candidate outreach. Edit templates and use them from the Candidates page.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Template Variables</p>
          <p className="mt-1">Use these placeholders in your templates. They will be replaced with actual data when sending:</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {['{{candidate_name}}', '{{missing_fields}}', '{{profile_link}}', '{{confirm_link}}', '{{position}}', '{{interview_date}}', '{{interview_time}}', '{{interview_mode}}', '{{interviewers}}', '{{vacancy_details}}', '{{locations}}', '{{referral_link}}'].map(v => (
              <code key={v} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{v}</code>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {templates.map(template => {
          const config = TYPE_LABELS[template.type] || { label: template.type, color: 'gray', desc: '' };
          return (
            <div key={template.id} className="bg-white rounded-xl border border-whn-border overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${config.color}-100 flex items-center justify-center`}>
                    <Mail size={20} className={`text-${config.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">{template.name}</h3>
                    <p className="text-xs text-text-secondary">{config.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex items-center gap-1 text-sm text-text-secondary hover:text-navy px-3 py-1.5 rounded-lg border border-whn-border hover:border-navy transition-colors"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    onClick={() => setEditTemplate({ ...template })}
                    className="flex items-center gap-1 text-sm text-white bg-navy px-3 py-1.5 rounded-lg hover:bg-navy-light transition-colors"
                  >
                    <Edit size={14} /> Edit
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

      {/* Edit Modal */}
      <Modal open={!!editTemplate} onClose={() => setEditTemplate(null)} title="Edit Template" size="lg">
        {editTemplate && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary font-medium">Template Name</label>
              <input
                type="text"
                value={editTemplate.name}
                onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Subject Line</label>
              <input
                type="text"
                value={editTemplate.subject}
                onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary font-medium">Email Body</label>
              <textarea
                value={editTemplate.body}
                onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })}
                rows={15}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold font-mono"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gold text-navy-dark px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dark flex items-center gap-2"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => setEditTemplate(null)}
                className="border border-whn-border px-6 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
