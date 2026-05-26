'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Loader2, LogIn, User, KeyRound, Mail, Eye, EyeOff, ArrowRight, Phone } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-navy" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'team' | 'candidate'>('team');
  const [candidateTab, setCandidateTab] = useState<'password' | 'token'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [portalToken, setPortalToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Login failed');
      setLoading(false);
      return;
    }

    router.push(redirect);
  };

  const handleCandidatePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        login_type: 'candidate',
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Login failed');
      setLoading(false);
      return;
    }

    router.push('/portal');
  };

  const handleCandidateTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_token: portalToken.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Invalid token');
      setLoading(false);
      return;
    }

    router.push('/portal');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-dark items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gold rounded-full blur-3xl" />
        </div>
        <div className="relative text-center">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <h2 className="text-3xl font-bold text-white mt-6">Talent Acquisition Platform</h2>
          <p className="text-gray-400 mt-3 max-w-md mx-auto">
            Streamline your hiring process — from sourcing to onboarding, all in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { label: 'Candidates', icon: '👥' },
              { label: 'Interviews', icon: '📅' },
              { label: 'Offers', icon: '📝' },
            ].map(item => (
              <div key={item.label} className="bg-white/5 backdrop-blur rounded-xl p-4 text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-white text-xs mt-2 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <h1 className="text-2xl font-bold text-navy mb-2">Welcome Back</h1>
          <p className="text-text-secondary text-sm mb-8">Sign in to continue to Warehouse Now ATS</p>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('team'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'team' ? 'bg-white text-navy shadow-sm' : 'text-text-secondary hover:text-navy'
              }`}
            >
              <KeyRound size={16} /> Team Login
            </button>
            <button
              onClick={() => { setMode('candidate'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'candidate' ? 'bg-white text-navy shadow-sm' : 'text-text-secondary hover:text-navy'
              }`}
            >
              <User size={16} /> Candidate Portal
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 animate-slide-in">
              {error}
            </div>
          )}

          {/* Team Login Form */}
          {mode === 'team' && (
            <form onSubmit={handleTeamLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Email</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.name@warehousenow.in"
                    className="w-full pl-10 pr-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <div className="relative mt-1">
                  <KeyRound size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-navy">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="mt-4 p-4 bg-navy/5 rounded-lg">
                <p className="text-xs text-text-secondary">
                  <span className="font-medium text-navy">Roles:</span> Admin, Recruiter, Hiring Manager, Viewer — each sees only what they need.
                </p>
              </div>
            </form>
          )}

          {/* Candidate Login */}
          {mode === 'candidate' && (
            <div className="space-y-4">
              {/* Sub-tabs: Password / Token */}
              <div className="flex border border-whn-border rounded-lg overflow-hidden">
                <button
                  onClick={() => { setCandidateTab('password'); setError(''); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    candidateTab === 'password' ? 'bg-navy text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  Email / Phone + Password
                </button>
                <button
                  onClick={() => { setCandidateTab('token'); setError(''); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    candidateTab === 'token' ? 'bg-navy text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  Access Token
                </button>
              </div>

              {/* Password Login */}
              {candidateTab === 'password' && (
                <form onSubmit={handleCandidatePasswordLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Email or Phone</label>
                    <div className="relative mt-1">
                      <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter your email or phone number"
                        className="w-full pl-10 pr-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Password</label>
                    <div className="relative mt-1">
                      <KeyRound size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-navy">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {loading ? 'Signing in...' : 'Access My Portal'}
                  </button>

                  <div className="p-3 bg-navy/5 rounded-lg">
                    <p className="text-xs text-text-secondary">
                      <span className="font-medium text-navy">Default password:</span> <code className="bg-gray-200 px-1.5 py-0.5 rounded text-navy text-[11px]">welcome123</code>
                    </p>
                  </div>
                </form>
              )}

              {/* Token Login */}
              {candidateTab === 'token' && (
                <form onSubmit={handleCandidateTokenLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Access Token</label>
                    <div className="relative mt-1">
                      <KeyRound size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={portalToken}
                        onChange={e => setPortalToken(e.target.value)}
                        placeholder="Paste the token from your email"
                        className="w-full pl-10 pr-3 py-2.5 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold text-navy-dark py-3 rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {loading ? 'Verifying...' : 'Access My Portal'}
                  </button>

                  <div className="p-3 bg-navy/5 rounded-lg">
                    <p className="text-xs text-text-secondary">
                      <span className="font-medium text-navy">Candidates:</span> Use the unique token sent to your email to access your portal.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer links */}
          <div className="mt-6 text-center space-y-2">
            <a href="/careers" className="text-xs text-navy font-medium hover:underline flex items-center justify-center gap-1">
              View Open Positions <ArrowRight size={12} />
            </a>
            <a href="/referral" className="text-xs text-text-secondary hover:text-navy">
              Refer a candidate
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
