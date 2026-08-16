import { NextRequest, NextResponse } from 'next/server';
import { setRefreshCookie } from '@/lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message || 'Registration failed' },
      { status: res.status },
    );
  }

  setRefreshCookie(data.refreshToken);

  return NextResponse.json({ accessToken: data.accessToken });
}
