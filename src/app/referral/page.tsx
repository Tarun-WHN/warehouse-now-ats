'use client';

import { useState, useRef } from 'react';
import { Logo } from '@/components/Logo';
import { Upload, CheckCircle, UserPlus, FileText, Loader2 } from 'lucide-react';

export default function ReferralPage() {
  const [referrerName, setReferrerName] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [candidateCity, setCandidateCity] = useState('');
  const [candidateSalary, setCandidateSalary] = useState('');
  const [candidateNotice, setCandidateNotice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (file) {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('source', 'Referral');
      formData.append('referrer_name', referrerName);
      formData.append('referrer_email', referrerEmail);
      await fetch('/api/upload', { method: 'POST', body: formData });
    } else {
      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: candidateName,
          phone: candidatePhone,
          email: candidateEmail,
          current_designation: candidateRole,
          current_location: candidateCity,
          current_ctc: candidateSalary,
          notice_period: candidateNotice,
          source: 'Referral',
          referrer_name: referrerName,
          referrer_email: referrerEmail,
        }),
      });
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-white rounded-2xl border border-whn-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Referral Submitted!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Thank you, {referrerName}! Your referral has been added to our talent pipeline.
            Our recruitment team will review the profile and reach out.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setReferrerName('');
              setReferrerEmail('');
              setCandidateName('');
              setCandidatePhone('');
              setCandidateEmail('');
              setCandidateRole('');
              setCandidateCity('');
              setCandidateSalary('');
              setCandidateNotice('');
              setFile(null);
            }}
            className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-dark"
          >
            Submit Another Referral
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-navy mt-4">Refer a Candidate</h1>
          <p className="text-text-secondary mt-2">
            Know someone who would be great at Warehouse Now? Submit their details below and help us grow our team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-whn-border p-6 md:p-8">
          {/* Referrer Info */}
          <div className="mb-6">
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-4">
              <UserPlus size={18} />
              Your Details (Referrer)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary font-medium">Your Name *</label>
                <input
                  type="text"
                  required
                  value={referrerName}
                  onChange={e => setReferrerName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Your Email *</label>
                <input
                  type="email"
                  required
                  value={referrerEmail}
                  onChange={e => setReferrerEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>

          <hr className="border-whn-border my-6" />

          {/* Candidate Info */}
          <div className="mb-6">
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-4">
              <FileText size={18} />
              Candidate Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-text-secondary font-medium">Candidate Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="Candidate's full name"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Phone</label>
                <input
                  type="tel"
                  value={candidatePhone}
                  onChange={e => setCandidatePhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Email</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={e => setCandidateEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="candidate@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Role / Designation</label>
                <input
                  type="text"
                  value={candidateRole}
                  onChange={e => setCandidateRole(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="e.g. Warehouse Manager"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Current City</label>
                <input
                  type="text"
                  value={candidateCity}
                  onChange={e => setCandidateCity(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Current Salary (CTC)</label>
                <input
                  type="text"
                  value={candidateSalary}
                  onChange={e => setCandidateSalary(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="e.g. 8 LPA"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Notice Period</label>
                <select
                  value={candidateNotice}
                  onChange={e => setCandidateNotice(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="">Select notice period</option>
                  <option>Immediate</option>
                  <option>15 days</option>
                  <option>30 days</option>
                  <option>60 days</option>
                  <option>90 days</option>
                </select>
              </div>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="text-sm text-text-secondary font-medium">Upload Resume (optional)</label>
              <div
                className="mt-1 drop-zone rounded-lg p-6 text-center cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={20} className="text-navy" />
                    <span className="text-sm text-navy font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="text-red-500 text-xs ml-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-text-secondary">Click to upload resume (PDF, DOC, DOCX)</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || (!candidateName && !candidatePhone && !candidateEmail && !file)}
            className="w-full bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Submit Referral
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary mt-6">
          Powered by Warehouse Now Talent Acquisition Platform
        </p>
      </div>
    </div>
  );
}
