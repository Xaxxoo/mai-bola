import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: authorization } });
  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}
