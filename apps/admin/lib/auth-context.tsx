'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api';

type AdminUser = { id: string; fullName: string; phone: string; role: string };
type TokenResponse = { accessToken: string };
type AuthValue = { user: AdminUser | null; loading: boolean; error: string | null; login: (phone: string, password: string) => Promise<boolean>; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ user: AdminUser | null; loading: boolean; error: string | null }>({ user: null, loading: true, error: null });

  const getMe = useCallback((token: string) => fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
    if (!res.ok) throw new Error('Unable to restore session');
    return res.json() as Promise<AdminUser>;
  }), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/refresh', { method: 'POST' }).then(async (res) => {
      if (!res.ok) throw new Error('No session');
      const data = await res.json() as TokenResponse;
      setAccessToken(data.accessToken);
      const user = await getMe(data.accessToken);
      if (user.role !== 'ADMIN') throw new Error('This account does not have admin access');
      if (!cancelled) setState({ user, loading: false, error: null });
    }).catch((error) => {
      const message = error instanceof Error && error.message !== 'No session' ? error.message : null;
      if (message) void fetch('/api/auth/logout', { method: 'POST' });
      if (!cancelled) setState({ user: null, loading: false, error: message });
    });
    return () => { cancelled = true; };
  }, [getMe]);

  const login = useCallback(async (phone: string, password: string) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) });
      const data = await response.json() as { accessToken: string; message?: string };
      if (!response.ok) throw new Error(data.message || 'Login failed');
      setAccessToken(data.accessToken);
      const user = await getMe(data.accessToken);
      if (user.role !== 'ADMIN') {
        await fetch('/api/auth/logout', { method: 'POST' });
        setAccessToken(null);
        throw new Error('This account does not have admin access. Use the supplier or driver app instead.');
      }
      setState({ user, loading: false, error: null });
      router.replace('/dashboard');
      return true;
    } catch (error) {
      setState({ user: null, loading: false, error: error instanceof Error ? error.message : 'Login failed' });
      return false;
    }
  }, [getMe, router]);

  const logout = useCallback(async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); setAccessToken(null); setState({ user: null, loading: false, error: null }); router.replace('/login'); }, [router]);
  const value = useMemo(() => ({ ...state, login, logout }), [login, logout, state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAdminAuth must be used within AdminAuthProvider'); return value; }
