'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let accessToken: string | null = null;
type JsonRecord = { [key: string]: unknown };

export function setAccessToken(token: string | null) { accessToken = token; }

async function refresh() {
  const response = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!response.ok) return null;
  const data = await response.json() as JsonRecord;
  accessToken = String(data.accessToken);
  return accessToken;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const init = { ...options, headers };
  let response = await fetch(`${API_URL}${path}`, init);
  if (response.status === 401) {
    const token = await refresh();
    if (token) { headers.set('Authorization', `Bearer ${token}`); response = await fetch(`${API_URL}${path}`, init); }
  }
  if (response.status === 401) throw new Error('Your session has expired');
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText })) as JsonRecord;
    throw new Error(String(error.message || 'Request failed'));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
