'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'team' | 'candidate';
  department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  loginAsCandidate: (token: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isRecruiter: boolean;
  isHiringManager: boolean;
  isCandidate: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({}),
  loginAsCandidate: async () => ({}),
  logout: async () => {},
  isAdmin: false,
  isRecruiter: false,
  isHiringManager: false,
  isCandidate: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setUser(data.user);
    return {};
  };

  const loginAsCandidate = async (token: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_token: token }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setUser(data.user);
    return {};
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginAsCandidate,
      logout,
      isAdmin: user?.role === 'Admin',
      isRecruiter: user?.role === 'Recruiter',
      isHiringManager: user?.role === 'Hiring Manager',
      isCandidate: user?.type === 'candidate',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
