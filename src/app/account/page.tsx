'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { UserCircle, KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChange = async () => {
    setMsg(null);
    if (newPassword.length < 6) { setMsg({ type: 'err', text: 'New password must be at least 6 characters.' }); return; }
    if (newPassword !== confirmPassword) { setMsg({ type: 'err', text: 'New password and confirmation do not match.' }); return; }
    setLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Password changed successfully.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setMsg({ type: 'err', text: data.error || 'Failed to change password.' });
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
        <UserCircle size={24} /> My Account
      </h1>
      <p className="text-text-secondary text-sm mt-1">Manage your profile and password.</p>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-whn-border p-6 mt-6">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider mb-4">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-secondary text-xs">Name</span>
            <p className="font-medium text-navy">{user?.name || '—'}</p>
          </div>
          <div>
            <span className="text-text-secondary text-xs">Email</span>
            <p className="font-medium text-navy">{user?.email || '—'}</p>
          </div>
          <div>
            <span className="text-text-secondary text-xs">Role</span>
            <p className="font-medium text-navy">{user?.role || '—'}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-whn-border p-6 mt-6">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
          <KeyRound size={15} /> Change Password
        </h2>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="text-sm font-medium text-text-secondary">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="Re-enter new password" />
          </div>

          {msg && (
            <div className={`flex items-center gap-2 text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {msg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {msg.text}
            </div>
          )}

          <button onClick={handleChange} disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" />Saving...</> : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
