'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

const zoneOptions = KADUNA_ZONES.map((z) => ({ value: z, label: z }));

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [zone, setZone] = useState('');
  const [street, setStreet] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleUseLocation() {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast('Location captured', 'success');
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast('Location permission denied. You can add it later.', 'info');
        } else {
          toast('Could not get your location. You can add it later.', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!zone) errors.zone = 'Select a zone';
    if (!street.trim()) errors.street = 'Enter your street address';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await api('/addresses', {
        method: 'POST',
        body: {
          label: 'Home',
          streetText: street.trim(),
          area: zone,
          zone,
          lat: lat ?? 0,
          lng: lng ?? 0,
          isDefault: true,
        },
      });
      toast('Address saved!', 'success');
      router.push('/');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to save address',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div className="mb-6">
        <p className="text-sm text-muted">
          Welcome, {user?.fullName?.split(' ')[0] || 'there'}!
        </p>
        <h1 className="text-2xl font-heading font-bold text-text">
          Add your address
        </h1>
        <p className="mt-1 text-sm text-muted">
          We need this so drivers can find you for pickups.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <Select
          label="Zone"
          options={zoneOptions}
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="Select your zone"
          error={fieldErrors.zone}
        />

        <Input
          label="Street address"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          error={fieldErrors.street}
          placeholder="e.g. 12 Ahmadu Bello Way"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">
            Location coordinates
          </label>
          {lat !== null && lng !== null ? (
            <div className="rounded-xl border border-green-200 bg-tint px-4 py-3 text-sm text-green-700">
              Location captured ({lat.toFixed(5)}, {lng.toFixed(5)})
            </div>
          ) : (
            <p className="text-xs text-muted">Optional — helps drivers find you faster</p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={locating}
            onClick={handleUseLocation}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            {lat !== null ? 'Update location' : 'Use my location'}
          </Button>
        </div>

        <div className="!mt-8 space-y-3">
          <Button type="submit" loading={saving} className="w-full" size="lg">
            Save address
          </Button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-center text-sm text-muted hover:text-text transition-colors"
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
