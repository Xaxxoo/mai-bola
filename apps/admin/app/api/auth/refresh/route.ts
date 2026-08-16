import { NextResponse } from 'next/server';
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from '@/lib/auth-cookies';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function POST() {
  const refreshToken = getRefreshCookie();
  if (!refreshToken) return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  const data = await response.json().catch(() => null) as { message?: string; refreshToken?: string; accessToken?: string } | null;
  if (!response.ok) { clearRefreshCookie(); return NextResponse.json({ message: data?.message || 'Token refresh failed' }, { status: 401 }); }
  if (!data?.refreshToken || !data.accessToken) return NextResponse.json({ message: 'Invalid refresh response' }, { status: 502 });
  setRefreshCookie(data.refreshToken);
  return NextResponse.json({ accessToken: data.accessToken });
}
