'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { toE164, isValidPhone } from '@/lib/format-phone';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const errors: Record<string, string> = {};
    if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await login(toE164(phone), password);
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-heading font-bold text-forest">Mai Bola</h1>
        <p className="mt-2 text-sm text-muted">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <PhoneInput
          label="Phone number"
          value={phone}
          onChange={setPhone}
          error={fieldErrors.phone}
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="Enter your password"
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-forest">
          Register
        </Link>
      </p>
    </div>
  );
}
