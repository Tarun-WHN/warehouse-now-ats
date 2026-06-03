'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { MapPin, IndianRupee, Users, Briefcase, CheckCircle, Loader2, Building2, Send, Paperclip, X } from 'lucide-react';

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', current_designation: '', current_employer: '', current_location: '', notice_period: '', current_ctc: '', expected_ctc: '' });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/careers').then(r => r.json()).then(setJobs);
  }, []);

  const resetForm = () => {
    setForm({ full_name: '', email: '', phone: '', current_designation: '', current_employer: '', current_location: '', notice_period: '', current_ctc: '', expected_ctc: '' });
    setResumeFile(null);
  };

  const handleApply = async () => {
    setApplying(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (selectedJob?.id) data.append('job_id', selectedJob.id);
    if (resumeFile) data.append('resume', resumeFile);
    await fetch('/api/careers/apply', { method: 'POST', body: data });
    setApplying(false);
    setApplied(true);
  };

  if (applied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-white rounded-2xl border border-whn-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Application Submitted!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Thank you, {form.full_name}! Your application for {selectedJob?.title} has been received.
            Our recruitment team will review your profile and reach out soon.
          </p>
          <button onClick={() => { setApplied(false); setSelectedJob(null); resetForm(); }}
            className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-dark">
            Browse More Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy-dark text-white py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-4"><Logo size="lg" /></div>
          <h1 className="text-3xl font-bold mt-4">Join Our Team</h1>
          <p className="text-gray-300 mt-2 max-w-2xl mx-auto">
            Be part of India&apos;s growing warehouse operations network. We&apos;re hiring across multiple cities and roles.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {selectedJob ? (
          /* Application Form */
          <div>
            <button onClick={() => setSelectedJob(null)} className="text-sm text-navy font-medium mb-4 hover:underline">&larr; Back to all jobs</button>
            <div className="bg-white rounded-2xl border border-whn-border p-6 md:p-8">
              <h2 className="text-xl font-bold text-navy mb-1">{selectedJob.title}</h2>
              <div className="flex gap-4 text-sm text-text-secondary mb-6 flex-wrap">
                {selectedJob.department_name && <span className="flex items-center gap-1"><Building2 size={14} />{selectedJob.department_name}</span>}
                {selectedJob.warehouse_site && <span className="flex items-center gap-1"><MapPin size={14} />{selectedJob.warehouse_site}</span>}
              </div>
              {selectedJob.description && <p className="text-sm text-text-secondary mb-6 whitespace-pre-wrap">{selectedJob.description}</p>}

              <h3 className="font-semibold text-navy mb-4">Apply for this position</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'full_name', label: 'Full Name *', ph: 'Your full name' },
                  { key: 'email', label: 'Email *', ph: 'your@email.com' },
                  { key: 'phone', label: 'Phone *', ph: '+91 98765 43210' },
                  { key: 'current_designation', label: 'Current Role', ph: 'e.g. Warehouse Manager' },
                  { key: 'current_employer', label: 'Current Company', ph: 'e.g. Acme Logistics' },
                  { key: 'current_location', label: 'Current City', ph: 'e.g. Mumbai' },
                  { key: 'notice_period', label: 'Notice Period', ph: 'e.g. 30 days' },
                  { key: 'current_ctc', label: 'Current CTC', ph: 'e.g. 6 LPA' },
                  { key: 'expected_ctc', label: 'Expected CTC', ph: 'e.g. 8 LPA' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-sm text-text-secondary font-medium">{f.label}</label>
                    <input value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold" placeholder={f.ph} />
                  </div>
                ))}
              </div>

              {/* Resume / CV upload (optional) */}
              <div className="mt-4">
                <label className="text-sm text-text-secondary font-medium">Resume / CV <span className="text-gray-400">(optional)</span></label>
                {resumeFile ? (
                  <div className="mt-1 flex items-center justify-between gap-3 px-3 py-2.5 border border-whn-border rounded-lg bg-navy/5">
                    <span className="flex items-center gap-2 text-sm text-navy min-w-0">
                      <Paperclip size={16} className="flex-shrink-0" />
                      <span className="truncate">{resumeFile.name}</span>
                    </span>
                    <button type="button" onClick={() => setResumeFile(null)} className="text-text-secondary hover:text-navy flex-shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center gap-2 px-3 py-2.5 border border-dashed border-whn-border rounded-lg text-sm text-text-secondary cursor-pointer hover:border-gold hover:bg-gold/5 transition-colors">
                    <Paperclip size={16} />
                    <span>Attach your CV (PDF, DOC, DOCX or TXT)</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>

              <button onClick={handleApply} disabled={applying || !form.full_name || (!form.email && !form.phone)}
                className="mt-6 bg-gold text-navy-dark px-8 py-3 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
                {applying ? <><Loader2 size={16} className="animate-spin" />Submitting...</> : <><Send size={16} />Submit Application</>}
              </button>
            </div>
          </div>
        ) : (
          /* Job Listings */
          <div>
            <h2 className="text-lg font-bold text-navy mb-4">{jobs.length} Open Position{jobs.length !== 1 ? 's' : ''}</h2>
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="bg-white rounded-xl border border-whn-border p-5 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase size={24} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-navy">{job.title}</h3>
                    <div className="flex gap-4 text-sm text-text-secondary mt-1 flex-wrap">
                      {job.department_name && <span className="flex items-center gap-1"><Building2 size={13} />{job.department_name}</span>}
                      {job.warehouse_site && <span className="flex items-center gap-1"><MapPin size={13} />{job.warehouse_site}</span>}
                      <span className="flex items-center gap-1"><Users size={13} />{job.num_positions} position{job.num_positions > 1 ? 's' : ''}</span>
                      {(job.expected_salary_min || job.expected_salary_max) && (
                        <span className="flex items-center gap-1"><IndianRupee size={13} />{job.expected_salary_min || '0'} - {job.expected_salary_max || ''}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedJob(job)}
                    className="bg-gold text-navy-dark px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark flex-shrink-0">
                    Apply Now
                  </button>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center py-16 text-text-secondary">
                  <Briefcase size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No open positions at the moment</p>
                  <p className="text-sm mt-1">Check back soon for new opportunities</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-text-secondary text-sm">Know someone great? <a href="/referral" className="text-navy font-semibold hover:underline">Refer a Candidate</a></p>
        </div>
        <p className="text-center text-xs text-text-secondary mt-4">Powered by Warehouse Now Talent Acquisition Platform</p>
      </div>
    </div>
  );
}
