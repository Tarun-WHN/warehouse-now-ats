'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Candidate } from '@/lib/types';
import { CheckCircle, AlertCircle, Loader2, Save, User, UserPlus, Clock, KeyRound, Eye, EyeOff } from 'lucide-react';

const PIPELINE = ['New', 'Contacted', 'Screening', 'Interviewing', 'Offered', 'Hired'];

export default function CandidatePortal() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<{ action: string; details: string; timestamp: string }[]>([]);
  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    // Works with token in URL or session cookie (password login)
    const url = token ? `/api/portal?token=${token}` : '/api/portal';
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Unauthorized'); return r.json(); })
      .then(data => {
        setCandidate(data);
        setForm(data);
        setLoading(false);
        if (data.id) {
          fetch(`/api/candidates/${data.id}?activity=true`).then(r => r.json()).then(setActivity).catch(() => {});
        }
      })
      .catch(() => { setError('Please log in to access your portal.'); setLoading(false); });
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    const url = token ? `/api/portal?token=${token}` : '/api/portal';
    const res = await fetch(url, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setCandidate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!currentPassword) { setPwError('Current password is required'); return; }
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Failed to change password'); }
      else {
        setPwSuccess('Password changed successfully!');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setTimeout(() => setPwSuccess(''), 4000);
      }
    } catch { setPwError('Network error. Please try again.'); }
    setPwLoading(false);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 size={32} className="animate-spin text-navy" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-2xl border border-whn-border p-8 max-w-md w-full text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-navy mb-2">Access Denied</h2>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <a href="/login" className="inline-flex items-center gap-2 bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark">
          Go to Login
        </a>
      </div>
    </div>
  );

  const currentStatus = candidate?.status || 'New';
  const currentIndex = PIPELINE.indexOf(currentStatus);
  const isRejected = currentStatus === 'Rejected';
  const isOnHold = currentStatus === 'On Hold';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size="lg" /></div>
          <h1 className="text-2xl font-bold text-navy mt-4">Your Application</h1>
          <p className="text-text-secondary mt-2">Track your application progress and update your profile</p>
        </div>

        {/* Status Pipeline */}
        <div className="bg-white rounded-2xl border border-whn-border p-6 mb-6">
          <h3 className="font-semibold text-navy mb-4 flex items-center gap-2"><Clock size={18} /> Application Status</h3>
          {isRejected ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 font-medium">Your application is not being considered at this time.</p>
              <p className="text-red-600 text-sm mt-1">We appreciate your interest and will keep your profile for future opportunities.</p>
            </div>
          ) : isOnHold ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 font-medium">Your application is on hold.</p>
              <p className="text-yellow-600 text-sm mt-1">Our team will reach out with updates soon.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {PIPELINE.map((step, i) => {
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-gold text-navy-dark ring-4 ring-gold/20' : 'bg-gray-200 text-gray-500'}`}>
                        {isCompleted ? <CheckCircle size={16} /> : i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-navy' : 'text-text-secondary'}`}>{step}</span>
                    </div>
                    {i < PIPELINE.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {activity.length > 0 && (
            <div className="mt-4 pt-4 border-t border-whn-border">
              <p className="text-xs font-semibold text-text-secondary mb-2">Recent Activity</p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {activity.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy mt-1 flex-shrink-0" />
                    <span className="font-medium text-navy">{a.action}</span>
                    <span className="text-gray-400">{new Date(a.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {saved && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 animate-slide-in">
            <CheckCircle size={18} className="text-green-600" />
            <p className="text-sm text-green-800 font-medium">Your profile has been updated successfully!</p>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-2xl border border-whn-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-whn-border">
            <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-navy">{candidate?.full_name || 'Your Profile'}</h3>
              <p className="text-xs text-text-secondary">Complete your profile to help us find the best role for you</p>
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
                  <input type="text" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold ${isEmpty ? 'border-amber-300 bg-amber-50/30' : 'border-whn-border'}`} />
                </div>
              );
            })}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full mt-6 bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Change Password */}
        <div className="mt-6 bg-white rounded-2xl border border-whn-border p-6">
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                <KeyRound size={20} className="text-navy" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-navy text-sm">Change Password</h3>
                <p className="text-xs text-text-secondary">Update your login password</p>
              </div>
            </div>
            <span className="text-text-secondary text-lg">{showPasswordSection ? '-' : '+'}</span>
          </button>

          {showPasswordSection && (
            <div className="mt-4 pt-4 border-t border-whn-border space-y-3">
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                  <CheckCircle size={14} /> {pwSuccess}
                </div>
              )}
              <div>
                <label className="text-sm text-text-secondary font-medium">Current Password</label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2.5 pr-10 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-navy">
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2.5 pr-10 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-navy">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full bg-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-navy-light disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}
        </div>

        {/* Referral Link */}
        <div className="mt-6 bg-white rounded-2xl border border-whn-border p-6 text-center">
          <UserPlus size={24} className="mx-auto mb-2 text-navy" />
          <h3 className="font-semibold text-navy mb-1">Know Someone Great?</h3>
          <p className="text-text-secondary text-sm mb-3">Help us grow our team by referring a friend or colleague</p>
          <a href="/referral" className="inline-flex items-center gap-2 bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark">
            <UserPlus size={16} /> Refer a Candidate
          </a>
        </div>

        <p className="text-center text-xs text-text-secondary mt-6">Powered by Warehouse Now Talent Acquisition Platform</p>
      </div>
    </div>
  );
}
