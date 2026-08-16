import { NextResponse } from 'next/server';
import {
  getRefreshCookie,
  setRefreshCookie,
  clearRefreshCookie,
} from '@/lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST() {
  const refreshToken = getRefreshCookie();

  if (!refreshToken) {
    return NextResponse.json(
      { message: 'No refresh token' },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    clearRefreshCookie();
    return NextResponse.json(
      { message: data?.message || 'Token refresh failed' },
      { status: 401 },
    );
  }

  setRefreshCookie(data.refreshToken);

  return NextResponse.json({ accessToken: data.accessToken });
}
