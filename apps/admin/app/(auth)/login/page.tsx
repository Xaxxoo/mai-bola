'use client';

import { FormEvent, useState } from 'react';
import { useAdminAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

export default function AdminLoginPage() {
  const { login, loading, error } = useAdminAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); const result = z.object({ phone: z.string().min(10, 'Enter a valid phone number'), password: z.string().min(1, 'Password is required') }).safeParse({ phone, password }); if (!result.success) return; await login(phone, password); }
  return <main className="flex min-h-screen items-center justify-center bg-bg px-6"><div className="w-full max-w-md"><div className="mb-8 text-center"><p className="text-sm font-medium text-forest">Mai Bola</p><h1 className="mt-2 font-heading text-4xl font-bold text-text">Operations portal</h1><p className="mt-2 text-sm text-muted">Sign in with an administrator account</p></div><form onSubmit={submit} className="rounded-2xl bg-white p-8 shadow-sm"><div className="space-y-4">{error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium text-text">Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5" placeholder="080XXXXXXXX" /></label><label className="block text-sm font-medium text-text">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5" /></label><Button type="submit" loading={loading} className="w-full" >Sign in</Button></div></form></div></main>;
}
