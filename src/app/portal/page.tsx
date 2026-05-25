'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Candidate } from '@/lib/types';
import { CheckCircle, AlertCircle, Loader2, Save, User } from 'lucide-react';

export default function CandidatePortal() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) { setError('No access token provided. Please use the link sent to your email.'); setLoading(false); return; }
    fetch(`/api/portal?token=${token}`)
      .then(r => { if (!r.ok) throw new Error('Invalid link'); return r.json(); })
      .then(data => { setCandidate(data); setForm(data); setLoading(false); })
      .catch(() => { setError('Invalid or expired access link. Please contact the recruiter.'); setLoading(false); });
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/portal?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setCandidate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const fields = [
    { key: 'full_name', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'current_location', label: 'Current City', required: true },
    { key: 'current_employer', label: 'Current Employer' },
    { key: 'current_designation', label: 'Current Designation' },
    { key: 'previous_employer', label: 'Previous Employer' },
    { key: 'previous_designation', label: 'Previous Designation' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'preferred_cities', label: 'Preferred Job Cities' },
    { key: 'hometown', label: 'Hometown' },
    { key: 'notice_period', label: 'Notice Period' },
    { key: 'current_ctc', label: 'Current CTC' },
    { key: 'expected_ctc', label: 'Expected CTC' },
    { key: 'family_background', label: 'Family Background' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-white rounded-2xl border border-whn-border p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-navy mb-2">Access Denied</h2>
          <p className="text-text-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size="lg" /></div>
          <h1 className="text-2xl font-bold text-navy mt-4">Your Candidate Profile</h1>
          <p className="text-text-secondary mt-2">Review and update your information below. Fields marked with * are required.</p>
        </div>

        {saved && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 animate-slide-in">
            <CheckCircle size={18} className="text-green-600" />
            <p className="text-sm text-green-800 font-medium">Your profile has been updated successfully!</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-whn-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-whn-border">
            <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-navy">{candidate?.full_name || 'Your Profile'}</h3>
              <p className="text-xs text-text-secondary">Last updated: {candidate?.date_added ? new Date(candidate.date_added).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map(f => {
              const isEmpty = !form[f.key] || form[f.key].trim() === '';
              return (
                <div key={f.key}>
                  <label className="text-sm text-text-secondary font-medium flex items-center gap-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                    {isEmpty && <span className="text-xs text-amber-600 ml-2">(missing)</span>}
                  </label>
                  <input
                    type="text"
                    value={form[f.key] || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold ${
                      isEmpty ? 'border-amber-300 bg-amber-50/30' : 'border-whn-border'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <p className="text-center text-xs text-text-secondary mt-6">
          Powered by Warehouse Now Talent Acquisition Platform
        </p>
      </div>
    </div>
  );
}
