'use client';

import { useState, useRef } from 'react';
import { Logo } from '@/components/Logo';
import {
  Upload, CheckCircle, UserPlus, FileText, Loader2, Copy, Share2,
  Search, Clock, MapPin, Briefcase, ArrowRight, Eye
} from 'lucide-react';

const PIPELINE = ['New', 'Contacted', 'Screening', 'Interviewing', 'Offered', 'Hired'];

type ReferralCandidate = {
  id: string;
  full_name: string;
  current_designation: string;
  current_location: string;
  status: string;
  date_added: string;
  status_changed_at?: string;
};

export default function ReferralPage() {
  const [mode, setMode] = useState<'refer' | 'track'>('refer');

  // Referral form
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

  // Tracking
  const [trackEmail, setTrackEmail] = useState('');
  const [referrals, setReferrals] = useState<ReferralCandidate[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [tracked, setTracked] = useState(false);

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

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackEmail) return;
    setTrackLoading(true);
    try {
      const res = await fetch(`/api/referral-tracker?email=${encodeURIComponent(trackEmail.trim().toLowerCase())}`);
      const data = await res.json();
      setReferrals(data.referrals || []);
      setTracked(true);
    } catch {
      setReferrals([]);
      setTracked(true);
    }
    setTrackLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      New: 'bg-blue-50 text-blue-700',
      Contacted: 'bg-indigo-50 text-indigo-700',
      Screening: 'bg-yellow-50 text-yellow-700',
      Interviewing: 'bg-purple-50 text-purple-700',
      Offered: 'bg-green-50 text-green-700',
      Hired: 'bg-emerald-50 text-emerald-800',
      Rejected: 'bg-red-50 text-red-700',
      'On Hold': 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const resetForm = () => {
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
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-navy mt-4">Employee Referral Program</h1>
          <p className="text-text-secondary mt-2">
            Refer talented people and track their progress through our hiring pipeline.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('refer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'refer' ? 'bg-white text-navy shadow-sm' : 'text-text-secondary hover:text-navy'
            }`}
          >
            <UserPlus size={16} /> Refer a Candidate
          </button>
          <button
            onClick={() => setMode('track')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'track' ? 'bg-white text-navy shadow-sm' : 'text-text-secondary hover:text-navy'
            }`}
          >
            <Eye size={16} /> Track My Referrals
          </button>
        </div>

        {/* ─── Refer Tab ─── */}
        {mode === 'refer' && (
          <>
            {submitted ? (
              <div className="bg-white rounded-2xl border border-whn-border p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-navy mb-2">Referral Submitted!</h2>
                <p className="text-text-secondary text-sm mb-4">
                  Thank you, {referrerName}! Your referral has been added to our talent pipeline.
                  Our recruitment team will review the profile and reach out.
                </p>
                <p className="text-sm text-navy font-medium mb-6">
                  You can track your referral&apos;s progress using the &quot;Track My Referrals&quot; tab with your email.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={resetForm}
                    className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-dark"
                  >
                    Submit Another Referral
                  </button>
                  <button
                    onClick={() => { setMode('track'); setTrackEmail(referrerEmail); }}
                    className="border border-whn-border text-navy px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50"
                  >
                    Track Referrals
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </>
        )}

        {/* ─── Track Tab ─── */}
        {mode === 'track' && (
          <div className="space-y-4">
            <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-whn-border p-6">
              <h3 className="font-semibold text-navy flex items-center gap-2 mb-4">
                <Search size={18} />
                Track Your Referrals
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Enter the email address you used when referring candidates to see their current status.
              </p>
              <div className="flex gap-3">
                <input
                  type="email"
                  required
                  value={trackEmail}
                  onChange={e => setTrackEmail(e.target.value)}
                  placeholder="Your referrer email address"
                  className="flex-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {trackLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Track
                </button>
              </div>
            </form>

            {tracked && (
              <div className="space-y-4">
                {referrals.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-whn-border p-8 text-center">
                    <UserPlus size={40} className="mx-auto mb-3 text-gray-200" />
                    <h3 className="font-semibold text-navy mb-1">No referrals found</h3>
                    <p className="text-sm text-text-secondary">
                      No candidates found for this email. Make sure you&apos;re using the same email you used when referring.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-navy/5 rounded-lg px-4 py-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-navy" />
                      <span className="text-sm font-medium text-navy">
                        {referrals.length} referral{referrals.length !== 1 ? 's' : ''} found
                      </span>
                    </div>

                    {referrals.map(r => {
                      const statusIndex = PIPELINE.indexOf(r.status);
                      const isRejected = r.status === 'Rejected';
                      const isOnHold = r.status === 'On Hold';

                      return (
                        <div key={r.id} className="bg-white rounded-2xl border border-whn-border p-6">
                          {/* Candidate header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-navy">{r.full_name}</h4>
                              <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                                {r.current_designation && (
                                  <span className="flex items-center gap-1"><Briefcase size={11} /> {r.current_designation}</span>
                                )}
                                {r.current_location && (
                                  <span className="flex items-center gap-1"><MapPin size={11} /> {r.current_location}</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(r.status)}`}>
                              {r.status}
                            </span>
                          </div>

                          {/* Progress pipeline */}
                          {!isRejected && !isOnHold ? (
                            <div className="flex items-center gap-1">
                              {PIPELINE.map((step, i) => {
                                const isCompleted = i < statusIndex;
                                const isCurrent = i === statusIndex;
                                return (
                                  <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold
                                        ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-gold text-navy-dark ring-2 ring-gold/30' : 'bg-gray-200 text-gray-400'}`}>
                                        {isCompleted ? <CheckCircle size={12} /> : i + 1}
                                      </div>
                                      <span className={`text-[9px] mt-0.5 font-medium ${isCurrent ? 'text-navy' : 'text-text-secondary'}`}>{step}</span>
                                    </div>
                                    {i < PIPELINE.length - 1 && (
                                      <div className={`h-0.5 flex-1 mx-0.5 ${i < statusIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : isRejected ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                              <p className="text-red-700 text-xs font-medium">Not being considered at this time. Profile kept for future opportunities.</p>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                              <p className="text-yellow-700 text-xs font-medium">Application is on hold. The team will provide updates soon.</p>
                            </div>
                          )}

                          {/* Dates */}
                          <div className="flex items-center gap-4 mt-3 text-[10px] text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> Referred: {new Date(r.date_added).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {r.status_changed_at && (
                              <span className="flex items-center gap-1">
                                <ArrowRight size={10} /> Last update: {new Date(r.status_changed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Share Section */}
        <div className="mt-6 bg-white rounded-2xl border border-whn-border p-6 text-center">
          <Share2 size={24} className="mx-auto mb-2 text-navy" />
          <h3 className="font-semibold text-navy mb-1">Share This Referral Page</h3>
          <p className="text-text-secondary text-sm mb-3">Send this link to colleagues to refer candidates</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <code className="flex-1 text-xs bg-gray-50 border border-whn-border px-3 py-2.5 rounded-lg text-left truncate">
              {typeof window !== 'undefined' ? window.location.href : '/referral'}
            </code>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="bg-gold text-navy-dark px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark flex items-center gap-1">
              <Copy size={14} /> Copy
            </button>
          </div>
          {/* QR Code */}
          <div className="mt-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin + '/referral') : '/referral'}`}
              alt="QR Code for referral page"
              className="mx-auto w-[120px] h-[120px] rounded-lg"
            />
            <p className="text-xs text-text-secondary mt-1">Scan to open referral form</p>
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary mt-6">
          Powered by Warehouse Now Talent Acquisition Platform
        </p>
      </div>
    </div>
  );
}
