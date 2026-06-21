'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/Modal';
import {
  OfferTemplate, SalaryCategory, PayoutFrequency, SalaryStructureRecord, Candidate,
} from '@/lib/types';
import { computeSalary, defaultStructure, formatINR } from '@/lib/salary';
import {
  FileText, Upload, Download, Mail, Trash2, Plus, Printer, Loader2, FileUp, Info, X, Search, UserCheck, Save,
} from 'lucide-react';

const CATEGORIES = ['Corporate', 'Warehouse', 'Temp'];
const FREQUENCIES: PayoutFrequency[] = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually'];

const emptyFields = () => ({
  employee_name: '',
  reporting_manager: '',
  offer_date: '',
  joining_date: '',
  designation: '',
  reporting_location: '',
  key_responsibilities: '',
  salary_offered: '',
  salary: defaultStructure(),
});

const PLACEHOLDERS = [
  ['{employee_name}', 'Employee name'],
  ['{reporting_manager}', 'Reporting manager'],
  ['{offer_date}', 'Date of offer letter'],
  ['{joining_date}', 'Date of joining'],
  ['{designation}', 'Designation'],
  ['{reporting_location}', 'Reporting location'],
  ['{key_responsibilities}', 'Key responsibilities'],
  ['{salary_offered}', 'CTC (free text, or auto = annual CTC)'],
  ['{#earnings}{component}: {monthly} / {annual}\\n{/earnings}', 'Earnings rows (monthly & annual)'],
  ['{#employer_items}…{/employer_items}', 'Employer contribution rows'],
  ['{#deductions}…{/deductions}', 'Deduction rows'],
  ['{gross_monthly} / {gross_annual}', 'Gross salary'],
  ['{ctc_monthly} / {ctc_annual}', 'Cost to company'],
  ['{net_monthly} / {net_annual}', 'Net take-home'],
  ['{variable_pay} / {variable_frequency}', 'Variable pay & payout frequency'],
  ['{variable_annual}', 'Annual variable pay'],
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

  // Candidate picker
  const [candQuery, setCandQuery] = useState('');
  const [candResults, setCandResults] = useState<Candidate[]>([]);
  const [candOpen, setCandOpen] = useState(false);
  const [linked, setLinked] = useState<{ id: string; email: string } | null>(null);

  // Saved salary structures
  const [structures, setStructures] = useState<SalaryStructureRecord[]>([]);

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
  const loadStructures = useCallback(() => {
    fetch('/api/salary-structures').then(r => r.json()).then(d => setStructures(Array.isArray(d) ? d : []));
  }, []);
  useEffect(() => { loadTemplates(); loadStructures(); }, [loadTemplates, loadStructures]);

  // Candidate search (debounced)
  useEffect(() => {
    if (!candQuery.trim()) { setCandResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/candidates?search=${encodeURIComponent(candQuery)}&per_page=8`)
        .then(r => r.json()).then(d => { setCandResults(d.candidates || []); setCandOpen(true); });
    }, 250);
    return () => clearTimeout(t);
  }, [candQuery]);

  const docTemplates = templates.filter(t => t.file_path);
  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const comp = computeSalary(fields.salary);

  const pickCandidate = (c: Candidate) => {
    setFields(f => ({
      ...f,
      employee_name: c.full_name || f.employee_name,
      designation: c.current_designation || f.designation,
      reporting_location: c.current_location || f.reporting_location,
    }));
    setLinked({ id: c.id, email: c.email || '' });
    setCandQuery(c.full_name || '');
    setCandOpen(false);
  };
  const clearCandidate = () => { setLinked(null); setCandQuery(''); };

  // Salary structure mutations
  const updateComp = (idx: number, patch: Record<string, unknown>) =>
    setFields(f => ({ ...f, salary: { ...f.salary, components: f.salary.components.map((c, i) => i === idx ? { ...c, ...patch } : c) } }));
  const addComp = (category: SalaryCategory) =>
    setFields(f => ({ ...f, salary: { ...f.salary, components: [...f.salary.components, { name: '', category, mode: 'fixed' as const, value: 0 }] } }));
  const removeComp = (idx: number) =>
    setFields(f => ({ ...f, salary: { ...f.salary, components: f.salary.components.filter((_, i) => i !== idx) } }));
  const setVariable = (patch: Record<string, unknown>) =>
    setFields(f => ({ ...f, salary: { ...f.salary, variable: { ...f.salary.variable, ...patch } } }));

  const loadStructure = (id: string) => {
    const s = structures.find(x => x.id === id);
    if (s) setFields(f => ({ ...f, salary: JSON.parse(JSON.stringify(s.structure)) }));
  };
  const saveStructure = async () => {
    const name = prompt('Name this salary structure (e.g. "Corporate – Bangalore"):');
    if (!name || !name.trim()) return;
    const res = await fetch('/api/salary-structures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), structure: fields.salary }),
    });
    if (res.ok) loadStructures();
  };
  const deleteStructure = async (id: string) => {
    await fetch(`/api/salary-structures/${id}`, { method: 'DELETE' });
    loadStructures();
  };

  const callApi = async (action: 'preview' | 'download' | 'email', extra: Record<string, unknown> = {}) =>
    fetch('/api/offer-letters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, action, fields, candidate_id: linked?.id, ...extra }),
    });

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
      setError(data.error || 'Download failed'); setBusy(''); return;
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
    setEmailTo(linked?.email || '');
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
    if (res.ok) setEmailMsg({ type: 'ok', text: `Offer letter emailed to ${emailTo.trim()}.` });
    else setEmailMsg({ type: 'err', text: data.error || 'Failed to send.' });
  };

  const uploadTemplate = async () => {
    setUpError('');
    if (!upName.trim()) { setUpError('Enter a template name.'); return; }
    if (!upFile) { setUpError('Choose a .docx file.'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', upFile); fd.append('name', upName.trim()); fd.append('category', upCategory);
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

            {/* Candidate picker */}
            <div className="relative">
              <label className="text-xs font-medium text-text-secondary">Pick Candidate (optional — auto-fills name, role, location & email)</label>
              {linked ? (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 border border-green-200 bg-green-50 rounded-lg text-sm">
                  <UserCheck size={15} className="text-green-600" />
                  <span className="font-medium text-navy">{fields.employee_name}</span>
                  {linked.email && <span className="text-text-secondary text-xs">{linked.email}</span>}
                  <button onClick={clearCandidate} className="ml-auto text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={candQuery} onChange={e => setCandQuery(e.target.value)} onFocus={() => candResults.length && setCandOpen(true)}
                    placeholder="Search candidate by name, email, phone…"
                    className="w-full pl-9 pr-3 py-2 border border-whn-border rounded-lg text-sm" />
                  {candOpen && candResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-whn-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {candResults.map(c => (
                        <button key={c.id} onClick={() => pickCandidate(c)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-whn-border last:border-0">
                          <p className="text-sm font-medium text-navy">{c.full_name || '—'}</p>
                          <p className="text-xs text-text-secondary">{[c.current_designation, c.email, c.phone].filter(Boolean).join(' · ')}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee Name" value={fields.employee_name} onChange={v => set('employee_name', v)} />
              <Field label="Reporting Manager" value={fields.reporting_manager} onChange={v => set('reporting_manager', v)} />
              <Field label="Date of Offer Letter" type="date" value={fields.offer_date} onChange={v => set('offer_date', v)} />
              <Field label="Date of Joining" type="date" value={fields.joining_date} onChange={v => set('joining_date', v)} />
              <Field label="Designation" value={fields.designation} onChange={v => set('designation', v)} />
              <Field label="Reporting Location" value={fields.reporting_location} onChange={v => set('reporting_location', v)} />
              <Field label="CTC text (optional override)" value={fields.salary_offered} onChange={v => set('salary_offered', v)} />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary">Key Responsibilities</label>
              <textarea value={fields.key_responsibilities} onChange={e => set('key_responsibilities', e.target.value)}
                rows={4} placeholder="One per line…"
                className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm" />
            </div>

            {/* Salary break-up */}
            <div className="bg-white border border-whn-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-navy">Salary Break-up</h3>
                <div className="flex items-center gap-2">
                  <select onChange={e => { if (e.target.value) loadStructure(e.target.value); e.target.value = ''; }}
                    className="px-2 py-1.5 border border-whn-border rounded-lg text-xs" defaultValue="">
                    <option value="">Load structure…</option>
                    {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={saveStructure} title="Save current as a reusable structure"
                    className="text-xs font-medium text-navy flex items-center gap-1 hover:underline"><Save size={13} /> Save</button>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary -mt-2">Amounts are monthly. Use “% of Basic” for components like HRA (40%), PF (12%), etc.</p>

              <SalaryGroup title="Earnings (build Gross)" category="earning" comps={fields.salary.components}
                basic={comp.basic} onUpdate={updateComp} onRemove={removeComp} onAdd={() => addComp('earning')} />
              <SalaryGroup title="Employer Contributions (add to CTC)" category="employer" comps={fields.salary.components}
                basic={comp.basic} onUpdate={updateComp} onRemove={removeComp} onAdd={() => addComp('employer')} />
              <SalaryGroup title="Deductions (reduce Net Take-home)" category="deduction" comps={fields.salary.components}
                basic={comp.basic} onUpdate={updateComp} onRemove={removeComp} onAdd={() => addComp('deduction')} />

              {/* Variable pay */}
              <div className="border border-whn-border rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-navy">
                  <input type="checkbox" checked={fields.salary.variable.enabled}
                    onChange={e => setVariable({ enabled: e.target.checked })} />
                  Add Variable Pay
                </label>
                {fields.salary.variable.enabled && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="text-[11px] text-text-secondary">Amount per payout</label>
                      <input type="number" value={fields.salary.variable.amount || ''} onChange={e => setVariable({ amount: Number(e.target.value) })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-whn-border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-[11px] text-text-secondary">Frequency</label>
                      <select value={fields.salary.variable.frequency} onChange={e => setVariable({ frequency: e.target.value })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-whn-border rounded-lg text-sm">
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <p className="col-span-2 text-[11px] text-text-secondary">Annual variable: ₹ {formatINR(comp.variableAnnual)}</p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
                <Total label="Gross Salary" monthly={comp.grossMonthly} annual={comp.grossAnnual} />
                <Total label="+ Employer Contributions" monthly={comp.employerMonthly} annual={comp.employerAnnual} muted />
                <Total label="Cost to Company (CTC)" monthly={comp.ctcMonthly} annual={comp.ctcAnnual} bold />
                {comp.variableEnabled && <p className="text-[11px] text-text-secondary text-right">CTC (annual) includes ₹ {formatINR(comp.variableAnnual)} variable</p>}
                <Total label="− Deductions" monthly={comp.deductionsMonthly} annual={comp.deductionsAnnual} muted />
                <Total label="Net Take-home" monthly={comp.netMonthly} annual={comp.netAnnual} bold accent />
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
            <div className="mt-1 bg-white border border-whn-border rounded-xl p-6 min-h-[400px] max-h-[80vh] overflow-y-auto offer-preview">
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

            {structures.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-bold text-navy uppercase tracking-wider mb-3">Saved Salary Structures</h2>
                <div className="space-y-2">
                  {structures.map(s => (
                    <div key={s.id} className="bg-white border border-whn-border rounded-xl p-3 flex items-center gap-3 text-sm">
                      <span className="font-medium text-navy flex-1">{s.name}</span>
                      <span className="text-xs text-text-secondary">{s.structure.components?.length || 0} components</span>
                      <button onClick={() => deleteStructure(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 h-fit">
            <h3 className="text-sm font-bold text-navy flex items-center gap-1.5 mb-2"><Info size={15} /> Placeholders</h3>
            <p className="text-xs text-text-secondary mb-3">In your Word file, type these tokens where the data should appear. They’re replaced automatically when a letter is generated.</p>
            <div className="space-y-1.5">
              {PLACEHOLDERS.map(([token, label]) => (
                <div key={token} className="text-xs">
                  <code className="bg-white border border-blue-100 px-1.5 py-0.5 rounded text-navy whitespace-pre-wrap break-all">{token}</code>
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

function SalaryGroup({ title, category, comps, basic, onUpdate, onRemove, onAdd }: {
  title: string; category: SalaryCategory;
  comps: { name: string; category: SalaryCategory; mode: string; value: number }[];
  basic: number;
  onUpdate: (idx: number, patch: Record<string, unknown>) => void;
  onRemove: (idx: number) => void; onAdd: () => void;
}) {
  const rows = comps.map((c, idx) => ({ c, idx })).filter(x => x.c.category === category);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</h4>
        <button onClick={onAdd} className="text-xs font-medium text-navy flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ c, idx }) => {
          const monthly = c.mode === 'fixed' ? (Number(c.value) || 0) : Math.round((Number(c.value) || 0) / 100 * basic);
          return (
            <div key={idx} className="flex gap-1.5 items-center">
              <input value={c.name} onChange={e => onUpdate(idx, { name: e.target.value })}
                placeholder="Component" className="flex-1 min-w-0 px-2 py-1.5 border border-whn-border rounded-lg text-sm" />
              <select value={c.mode} onChange={e => onUpdate(idx, { mode: e.target.value })}
                className="px-1.5 py-1.5 border border-whn-border rounded-lg text-xs">
                <option value="fixed">₹ Fixed</option>
                <option value="percent_basic">% of Basic</option>
              </select>
              <input type="number" value={c.value || ''} onChange={e => onUpdate(idx, { value: Number(e.target.value) })}
                className="w-20 px-2 py-1.5 border border-whn-border rounded-lg text-sm" />
              <span className="w-24 text-right text-xs text-text-secondary tabular-nums">₹ {formatINR(monthly)}</span>
              <button onClick={() => onRemove(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X size={14} /></button>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-text-secondary italic">None</p>}
      </div>
    </div>
  );
}

function Total({ label, monthly, annual, bold, muted, accent }: {
  label: string; monthly: number; annual: number; bold?: boolean; muted?: boolean; accent?: boolean;
}) {
  return (
    <div className={`flex justify-between items-baseline ${bold ? 'font-bold' : ''} ${muted ? 'text-text-secondary' : ''} ${accent ? 'text-green-700' : 'text-navy'}`}>
      <span>{label}</span>
      <span className="tabular-nums">₹ {formatINR(monthly)}<span className="text-xs font-normal text-text-secondary"> /mo</span>
        <span className="mx-1 text-gray-300">·</span>₹ {formatINR(annual)}<span className="text-xs font-normal text-text-secondary"> /yr</span></span>
    </div>
  );
}
