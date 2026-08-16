'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@mai-bola/shared';
import { setAccessToken, getAccessToken } from '@/lib/api';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

type RegisterPayload = {
  phone: string;
  password: string;
  fullName: string;
  supplierType: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async (token: string) => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  }, []);

  // On mount, try to restore session via refresh token cookie
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        // If we already have a token in memory (e.g., after login), use it
        let token = getAccessToken();

        if (!token) {
          // Try to get a new access token via refresh
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
          });
          if (!refreshRes.ok) {
            if (!cancelled) setState({ user: null, loading: false, error: null });
            return;
          }
          const refreshData = await refreshRes.json();
          token = refreshData.accessToken;
          setAccessToken(token!);
        }

        const user = await fetchUser(token!);
        if (!cancelled) setState({ user, loading: false, error: null });
      } catch {
        setAccessToken(null);
        if (!cancelled) setState({ user: null, loading: false, error: null });
      }
    }

    restore();
    return () => { cancelled = true; };
  }, [fetchUser]);

  const login = useCallback(
    async (phone: string, password: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setState((s) => ({
            ...s,
            loading: false,
            error: data.message || 'Login failed',
          }));
          return;
        }

        setAccessToken(data.accessToken);
        const user = await fetchUser(data.accessToken);
        setState({ user, loading: false, error: null });
        router.push('/');
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Login failed',
        }));
      }
    },
    [fetchUser, router],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          setState((s) => ({
            ...s,
            loading: false,
            error: data.message || 'Registration failed',
          }));
          return;
        }

        setAccessToken(data.accessToken);
        const user = await fetchUser(data.accessToken);
        setState({ user, loading: false, error: null });
        router.push('/onboarding');
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Registration failed',
        }));
      }
    },
    [fetchUser, router],
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAccessToken(null);
    setState({ user: null, loading: false, error: null });
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
