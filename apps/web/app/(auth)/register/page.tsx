'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SupplierType } from '@mai-bola/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { toE164, isValidPhone } from '@/lib/format-phone';

const supplierTypes = [
  {
    value: SupplierType.HOUSEHOLD,
    label: 'Household',
    description: 'Collect bottles from home',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 28V14l12-10 12 10v14H4z" />
        <rect x="12" y="18" width="8" height="10" />
      </svg>
    ),
  },
  {
    value: SupplierType.WASTE_PICKER,
    label: 'Waste Picker',
    description: 'Collect from public areas',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6a4 4 0 108 0" />
        <path d="M8 28l2-14h12l2 14" />
        <line x1="16" y1="14" x2="16" y2="28" />
      </svg>
    ),
  },
  {
    value: SupplierType.BUSINESS,
    label: 'Business',
    description: 'Shop, restaurant, or office',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="24" height="20" rx="2" />
        <path d="M4 14h24" />
        <rect x="12" y="20" width="8" height="8" />
        <path d="M10 4h12v4H10z" />
      </svg>
    ),
  },
];

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [supplierType, setSupplierType] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const errors: Record<string, string> = {};
    if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number';
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    if (!supplierType) errors.supplierType = 'Select a supplier type';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await register({
      phone: toE164(phone),
      fullName: fullName.trim(),
      supplierType,
      password,
    });
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-heading font-bold text-forest">
          Create Account
        </h1>
        <p className="mt-2 text-sm text-muted">
          Start recycling PET bottles today
        </p>
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
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={fieldErrors.fullName}
          placeholder="Your full name"
        />

        {/* Supplier type cards */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text">
            What type of supplier are you?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {supplierTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSupplierType(type.value)}
                className={`flex flex-col items-center rounded-xl border-2 p-3 text-center transition-colors ${
                  supplierType === type.value
                    ? 'border-forest bg-tint text-forest'
                    : 'border-gray-200 bg-white text-muted hover:border-green-200'
                }`}
              >
                <div className="mb-1">{type.icon}</div>
                <span className="text-xs font-semibold">{type.label}</span>
                <span className="mt-0.5 text-[10px] leading-tight">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
          {fieldErrors.supplierType && (
            <p className="text-xs text-red-500">{fieldErrors.supplierType}</p>
          )}
        </div>

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="At least 8 characters"
          helper="Must be at least 8 characters"
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-forest">
          Sign in
        </Link>
      </p>
    </div>
  );
}
