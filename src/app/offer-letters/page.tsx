'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/Modal';
import { OfferTemplate, SalaryLineItem } from '@/lib/types';
import {
  FileText, Upload, Download, Mail, Trash2, Plus, Printer, Loader2, FileUp, Info, X,
} from 'lucide-react';

const CATEGORIES = ['Corporate', 'Warehouse', 'Temp'];

const emptyFields = () => ({
  employee_name: '',
  reporting_manager: '',
  offer_date: '',
  joining_date: '',
  designation: '',
  reporting_location: '',
  key_responsibilities: '',
  salary_offered: '',
  salary_items: [
    { component: 'Basic', amount: '' },
    { component: 'HRA', amount: '' },
    { component: 'Special Allowance', amount: '' },
  ] as SalaryLineItem[],
});

const PLACEHOLDERS = [
  ['{employee_name}', 'Employee name'],
  ['{reporting_manager}', 'Reporting manager'],
  ['{offer_date}', 'Date of offer letter'],
  ['{joining_date}', 'Date of joining'],
  ['{designation}', 'Designation'],
  ['{reporting_location}', 'Reporting location'],
  ['{key_responsibilities}', 'Key responsibilities'],
  ['{salary_offered}', 'Salary offered (CTC)'],
  ['{#salary_items}{component}: {amount}\n{/salary_items}', 'Salary break-up (loop)'],
  ['{total_salary}', 'Total of the break-up'],
];

export default function OfferLettersPage() {
  const [tab, setTab] = useState<'generate' | 'templates'>('generate');
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);

  // Generate state
  const [templateId, setTemplateId] = useState('');
  const [fields, setFields] = useState(emptyFields());
  const [previewHtml, setPreviewHtml] = useState('');
  const [busy, setBusy] = useState<'' | 'preview' | 'word' | 'pdf'>('');
  const [error, setError] = useState('');

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upName, setUpName] = useState('');
  const [upCategory, setUpCategory] = useState('Corporate');
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upError, setUpError] = useState('');

  const loadTemplates = useCallback(() => {
    fetch('/api/offer-templates').then(r => r.json()).then(d => setTemplates(Array.isArray(d) ? d : []));
  }, []);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const docTemplates = templates.filter(t => t.file_path);
  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const setSalary = (i: number, key: keyof SalaryLineItem, v: string) =>
    setFields(f => ({ ...f, salary_items: f.salary_items.map((it, idx) => idx === i ? { ...it, [key]: v } : it) }));
  const addSalaryRow = () => setFields(f => ({ ...f, salary_items: [...f.salary_items, { component: '', amount: '' }] }));
  const removeSalaryRow = (i: number) => setFields(f => ({ ...f, salary_items: f.salary_items.filter((_, idx) => idx !== i) }));
  const salaryTotal = fields.salary_items.reduce((t, it) => {
    const n = parseFloat(String(it.amount).replace(/[^0-9.]/g, ''));
    return t + (isNaN(n) ? 0 : n);
  }, 0);

  const callApi = async (action: 'preview' | 'download' | 'email', extra: Record<string, unknown> = {}) => {
    return fetch('/api/offer-letters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, action, fields, ...extra }),
    });
  };

  const doPreview = async (): Promise<string> => {
    setError('');
    if (!templateId) { setError('Select a template first.'); return ''; }
    setBusy('preview');
    const res = await callApi('preview');
    setBusy('');
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Preview failed'); return ''; }
    setPreviewHtml(data.html || '');
    return data.html || '';
  };

  const downloadWord = async () => {
    setError('');
    if (!templateId) { setError('Select a template first.'); return; }
    setBusy('word');
    const res = await callApi('download');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Download failed'); setBusy('');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Offer_Letter_${(fields.employee_name || 'candidate').replace(/[^a-zA-Z0-9]+/g, '_')}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy('');
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    const html = previewHtml || await doPreview();
    setBusy('');
    if (!html) return;
    const win = window.open('', '_blank');
    if (!win) { setError('Allow pop-ups to print/save as PDF.'); return; }
    win.document.write(`<!doctype html><html><head><title>Offer Letter</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.5; font-size: 12pt; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 6px 10px; text-align: left; }
        img { max-width: 100%; }
      </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
  };

  const openEmail = () => {
    setEmailMsg(null);
    setEmailSubject(`Offer Letter — ${fields.employee_name || 'Warehouse Now'}`);
    setEmailTo('');
    setCoverLetter('');
    setEmailOpen(true);
  };
  const sendEmail = async () => {
    setEmailMsg(null);
    if (!emailTo.trim()) { setEmailMsg({ type: 'err', text: 'Enter the recipient email.' }); return; }
    setSending(true);
    const res = await callApi('email', { email: emailTo.trim(), subject: emailSubject, cover_letter: coverLetter });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setEmailMsg({ type: 'ok', text: `Offer letter emailed to ${emailTo.trim()}.` });
    } else {
      setEmailMsg({ type: 'err', text: data.error || 'Failed to send.' });
    }
  };

  const uploadTemplate = async () => {
    setUpError('');
    if (!upName.trim()) { setUpError('Enter a template name.'); return; }
    if (!upFile) { setUpError('Choose a .docx file.'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', upFile);
    fd.append('name', upName.trim());
    fd.append('category', upCategory);
    const res = await fetch('/api/offer-templates', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setUpError(data.error || 'Upload failed'); return; }
    setUploadOpen(false);
    setUpName(''); setUpFile(null); setUpCategory('Corporate');
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this offer-letter format?')) return;
    await fetch(`/api/offer-templates/${id}`, { method: 'DELETE' });
    if (templateId === id) { setTemplateId(''); setPreviewHtml(''); }
    loadTemplates();
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2"><FileText size={24} /> Offer Letters</h1>
          <p className="text-text-secondary text-sm mt-0.5">Generate offer letters from your Word formats. Admin only.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-whn-border">
        {(['generate', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? 'border-gold text-navy' : 'border-transparent text-text-secondary hover:text-navy'}`}>
            {t === 'generate' ? 'Generate Letter' : 'Letter Formats'}
          </button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary">Offer Letter Format</label>
              <select value={templateId} onChange={e => { setTemplateId(e.target.value); setPreviewHtml(''); }}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                <option value="">Select a format…</option>
                {docTemplates.map(t => <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>)}
              </select>
              {docTemplates.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No formats uploaded yet — add one in the “Letter Formats” tab.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee Name" value={fields.employee_name} onChange={v => set('employee_name', v)} />
              <Field label="Reporting Manager" value={fields.reporting_manager} onChange={v => set('reporting_manager', v)} />
              <Field label="Date of Offer Letter" type="date" value={fields.offer_date} onChange={v => set('offer_date', v)} />
              <Field label="Date of Joining" type="date" value={fields.joining_date} onChange={v => set('joining_date', v)} />
              <Field label="Designation" value={fields.designation} onChange={v => set('designation', v)} />
              <Field label="Reporting Location" value={fields.reporting_location} onChange={v => set('reporting_location', v)} />
              <Field label="Salary Offered (CTC)" value={fields.salary_offered} onChange={v => set('salary_offered', v)} />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary">Key Responsibilities</label>
              <textarea value={fields.key_responsibilities} onChange={e => set('key_responsibilities', e.target.value)}
                rows={4} placeholder="One per line…"
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>

            {/* Salary break-up */}
            <div className="bg-white border border-whn-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-navy">Salary Break-up</h3>
                <button onClick={addSalaryRow} className="text-xs font-medium text-navy flex items-center gap-1 hover:underline">
                  <Plus size={13} /> Add row
                </button>
              </div>
              <div className="space-y-2">
                {fields.salary_items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={it.component} onChange={e => setSalary(i, 'component', e.target.value)}
                      placeholder="Component (e.g. Basic)" className="flex-1 px-2 py-1.5 border border-whn-border rounded-lg text-sm" />
                    <input value={it.amount} onChange={e => setSalary(i, 'amount', e.target.value)}
                      placeholder="Amount" className="w-32 px-2 py-1.5 border border-whn-border rounded-lg text-sm" />
                    <button onClick={() => removeSalaryRow(i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-whn-border text-sm">
                <span className="font-medium text-text-secondary">Total</span>
                <span className="font-bold text-navy">₹ {salaryTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <button onClick={doPreview} disabled={busy === 'preview'}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-whn-border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
                {busy === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Preview
              </button>
              <button onClick={downloadWord} disabled={busy === 'word'}
                className="px-4 py-2.5 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-dark flex items-center gap-1.5 disabled:opacity-50">
                {busy === 'word' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download Word
              </button>
              <button onClick={downloadPdf} disabled={busy === 'pdf'}
                className="px-4 py-2.5 rounded-lg text-sm font-bold border border-whn-border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
                {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />} Download PDF
              </button>
              <button onClick={openEmail}
                className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gold text-navy-dark hover:bg-gold-dark flex items-center gap-1.5">
                <Mail size={15} /> Email to Candidate
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Preview</label>
            <div className="mt-1 bg-white border border-whn-border rounded-xl p-6 min-h-[400px] max-h-[70vh] overflow-y-auto offer-preview">
              {previewHtml
                ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                : <p className="text-text-secondary text-sm text-center py-20">Click <b>Preview</b> to see the filled letter.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Uploaded Formats</h2>
              <button onClick={() => { setUpError(''); setUploadOpen(true); }}
                className="px-3 py-2 rounded-lg text-sm font-bold bg-gold text-navy-dark hover:bg-gold-dark flex items-center gap-1.5">
                <Upload size={15} /> Upload .docx
              </button>
            </div>
            <div className="space-y-2">
              {docTemplates.map(t => (
                <div key={t.id} className="bg-white border border-whn-border rounded-xl p-4 flex items-center gap-3">
                  <FileText size={20} className="text-navy flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm">{t.name}
                      {t.category && <span className="ml-2 text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">{t.category}</span>}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{t.original_filename}</p>
                  </div>
                  <a href={`/api/offer-templates/${t.id}?download=original`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Download original"><Download size={15} /></a>
                  <button onClick={() => deleteTemplate(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400" title="Delete"><Trash2 size={15} /></button>
                </div>
              ))}
              {docTemplates.length === 0 && (
                <div className="bg-white border border-dashed border-whn-border rounded-xl p-10 text-center text-text-secondary text-sm">
                  <FileUp size={32} className="mx-auto mb-2 text-gray-300" />
                  No formats yet. Upload your Corporate, Warehouse, and Temp Word formats.
                </div>
              )}
            </div>
          </div>

          {/* Placeholder help */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 h-fit">
            <h3 className="text-sm font-bold text-navy flex items-center gap-1.5 mb-2"><Info size={15} /> Placeholders</h3>
            <p className="text-xs text-text-secondary mb-3">In your Word file, type these tokens where the data should appear. They’re replaced automatically when a letter is generated.</p>
            <div className="space-y-1.5">
              {PLACEHOLDERS.map(([token, label]) => (
                <div key={token} className="text-xs">
                  <code className="bg-white border border-blue-100 px-1.5 py-0.5 rounded text-navy whitespace-pre-wrap">{token}</code>
                  <span className="text-text-secondary ml-1.5">— {label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailOpen && (
        <Modal open title="Email Offer Letter" onClose={() => setEmailOpen(false)} size="lg">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">To (candidate email)</label>
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} type="email"
                placeholder="candidate@example.com" className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Subject</label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Cover Letter (email body)</label>
              <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={6}
                placeholder="Leave blank to use a default cover note…"
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>
            <p className="text-xs text-text-secondary">The filled offer letter (.docx) is attached automatically.</p>
            {emailMsg && <p className={`text-sm ${emailMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{emailMsg.text}</p>}
            <div className="flex gap-2">
              <button onClick={sendEmail} disabled={sending}
                className="bg-gold text-navy-dark px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Mail size={15} /> Send</>}
              </button>
              <button onClick={() => setEmailOpen(false)} className="px-5 py-2.5 rounded-lg text-sm border border-whn-border">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <Modal open title="Upload Offer-Letter Format" onClose={() => setUploadOpen(false)} size="md">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Name</label>
              <input value={upName} onChange={e => setUpName(e.target.value)}
                placeholder="e.g. Corporate Employees Offer Letter"
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Category</label>
              <select value={upCategory} onChange={e => setUpCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Word file (.docx)</label>
              <input type="file" accept=".docx" onChange={e => setUpFile(e.target.files?.[0] || null)}
                className="w-full mt-1 text-sm" />
              <p className="text-xs text-text-secondary mt-1">Add the placeholder tokens (see the “Placeholders” panel) to your Word file before uploading.</p>
            </div>
            {upError && <p className="text-sm text-red-600">{upError}</p>}
            <div className="flex gap-2">
              <button onClick={uploadTemplate} disabled={uploading}
                className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> Upload</>}
              </button>
              <button onClick={() => setUploadOpen(false)} className="px-5 py-2.5 rounded-lg text-sm border border-whn-border">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
    </div>
  );
}
