import { NextRequest, NextResponse } from 'next/server';
import { setRefreshCookie } from '@/lib/auth-cookies';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function POST(request: NextRequest) {
  const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()) });
  const data = await response.json().catch(() => null) as { message?: string; refreshToken?: string; accessToken?: string } | null;
  if (!response.ok) return NextResponse.json({ message: data?.message || 'Login failed' }, { status: response.status });
  if (!data?.refreshToken || !data.accessToken) return NextResponse.json({ message: 'Invalid login response' }, { status: 502 });
  setRefreshCookie(data.refreshToken);
  return NextResponse.json({ accessToken: data.accessToken });
}
