import { NextResponse } from 'next/server';
import { clearRefreshCookie } from '@/lib/auth-cookies';

export async function POST() {
  clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
