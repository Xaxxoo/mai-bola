'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { useCreatePickup } from '@/lib/hooks/use-pickups';
import { useAddresses, useCreateAddress } from '@/lib/hooks/use-addresses';
import { useUpload } from '@/lib/hooks/use-upload';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TopBar } from '@/components/ui/top-bar';
import { formatNaira } from '@/lib/format-money';

const PRICE_PER_KG = 120;
const QUICK_PICKS = [5, 10, 25, 50];
const ZONE_OPTIONS = KADUNA_ZONES.map((z) => ({ value: z, label: z }));

type WizardStep = 'amount' | 'location' | 'confirm';

export default function NewPickupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createPickup = useCreatePickup();
  const addresses = useAddresses();
  const createAddress = useCreateAddress();
  const upload = useUpload();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('amount');

  // Step 1: Amount
  const [estimatedKg, setEstimatedKg] = useState(10);

  // Step 2: Location
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newZone, setNewZone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newLat, setNewLat] = useState(0);
  const [newLng, setNewLng] = useState(0);
  const [locating, setLocating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Step 3: Confirm
  const [note, setNote] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addressList = addresses.data ?? [];
  const selectedAddress = addressList.find((a) => a.id === selectedAddressId);
  const estimate = estimatedKg * PRICE_PER_KG;

  async function handleAddAddress() {
    if (!newZone || !newStreet.trim()) {
      toast('Fill in zone and street', 'error');
      return;
    }
    setSavingAddress(true);
    try {
      const addr = await createAddress.mutateAsync({
        label: 'Pickup location',
        streetText: newStreet.trim(),
        zone: newZone,
        lat: newLat,
        lng: newLng,
      });
      setSelectedAddressId(addr.id);
      setShowNewAddress(false);
      toast('Address saved', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save address', 'error');
    } finally {
      setSavingAddress(false);
    }
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      toast('Geolocation not supported', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(pos.coords.latitude);
        setNewLng(pos.coords.longitude);
        setLocating(false);
        toast('Location captured', 'success');
      },
      () => {
        setLocating(false);
        toast('Could not get location', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handlePhoto() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await upload.mutateAsync(file);
      setPhotoUrls((prev) => [...prev, url]);
      toast('Photo uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  }

  async function handleSubmit() {
    try {
      await createPickup.mutateAsync({
        addressId: selectedAddressId,
        estimatedKg,
        note: note.trim() || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });
      toast('Pickup requested!', 'success');
      router.push('/pickups');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create pickup', 'error');
    }
  }

  const stepTitles: Record<WizardStep, string> = {
    amount: 'How much?',
    location: 'Where?',
    confirm: 'Confirm',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Request Pickup" back />

      {/* Step indicator */}
      <div className="flex px-4 pt-3 gap-2">
        {(['amount', 'location', 'confirm'] as WizardStep[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= ['amount', 'location', 'confirm'].indexOf(step)
                ? 'bg-forest'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-4 pt-4 pb-6">
        <h2 className="mb-4 text-xl font-heading font-bold text-text">
          {stepTitles[step]}
        </h2>

        {/* Step 1: Amount */}
        {step === 'amount' && (
          <div className="space-y-6">
            {/* Slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-forest">{estimatedKg} kg</span>
                <span className="text-sm text-muted">
                  ≈ {formatNaira(estimate)} at ₦{PRICE_PER_KG}/kg
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={estimatedKg}
                onChange={(e) => setEstimatedKg(Number(e.target.value))}
                className="w-full accent-forest"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>1 kg</span>
                <span>100 kg</span>
              </div>
            </div>

            {/* Quick picks */}
            <div className="flex gap-2">
              {QUICK_PICKS.map((kg) => (
                <button
                  key={kg}
                  onClick={() => setEstimatedKg(kg)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    estimatedKg === kg
                      ? 'bg-forest text-white'
                      : 'bg-white border border-gray-200 text-text hover:border-green-200'
                  }`}
                >
                  {kg} kg
                </button>
              ))}
            </div>

            {/* Estimate highlight */}
            <Card className="bg-tint border border-green-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-forest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">
                    Estimated payout: {formatNaira(estimate)}
                  </p>
                  <p className="text-xs text-muted">
                    Actual amount based on weighed kg at collection
                  </p>
                </div>
              </div>
            </Card>

            <Button onClick={() => setStep('location')} className="w-full" size="lg">
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 'location' && (
          <div className="space-y-4">
            {addresses.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : addressList.length === 0 && !showNewAddress ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted mb-4">No saved addresses</p>
                <Button variant="secondary" onClick={() => setShowNewAddress(true)}>
                  Add address
                </Button>
              </div>
            ) : (
              <>
                {/* Saved addresses */}
                <div className="space-y-2">
                  {addressList.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => { setSelectedAddressId(addr.id); setShowNewAddress(false); }}
                      className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                        selectedAddressId === addr.id
                          ? 'border-forest bg-tint'
                          : 'border-gray-200 bg-white hover:border-green-200'
                      }`}
                    >
                      <p className="text-sm font-medium text-text">{addr.label}</p>
                      <p className="text-xs text-muted">
                        {addr.streetText}, {addr.zone}
                      </p>
                    </button>
                  ))}
                </div>

                {!showNewAddress && (
                  <button
                    onClick={() => setShowNewAddress(true)}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 p-3 text-sm text-muted hover:border-green-300 hover:text-forest transition-colors"
                  >
                    + Add new address
                  </button>
                )}
              </>
            )}

            {/* New address form */}
            {showNewAddress && (
              <Card className="space-y-3">
                <p className="text-sm font-semibold text-text">New address</p>
                <Select
                  label="Zone"
                  options={ZONE_OPTIONS}
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Select zone"
                />
                <Input
                  label="Street"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="e.g. 12 Ahmadu Bello Way"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={locating}
                    onClick={handleUseLocation}
                  >
                    Use my location
                  </Button>
                  {newLat !== 0 && (
                    <span className="text-xs text-green-600 self-center">
                      Location set
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={savingAddress}
                    onClick={handleAddAddress}
                  >
                    Save address
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('amount')} className="flex-1" size="lg">
                Back
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedAddressId}
                className="flex-1"
                size="lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Estimated weight</span>
                  <span className="font-semibold text-text">{estimatedKg} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Estimated payout</span>
                  <span className="font-semibold text-forest">{formatNaira(estimate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Pickup location</span>
                  <span className="font-semibold text-text text-right max-w-[180px] truncate">
                    {selectedAddress?.streetText}, {selectedAddress?.zone}
                  </span>
                </div>
              </div>
            </Card>

            {/* Note */}
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Ring the gate bell"
            />

            {/* Photo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text">
                Photo (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex gap-2 flex-wrap">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotoUrls((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-0 right-0 bg-black/50 text-white rounded-bl-lg px-1.5 py-0.5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={handlePhoto}
                  disabled={uploading}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-muted hover:border-green-300 hover:text-forest transition-colors"
                >
                  {uploading ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('location')} className="flex-1" size="lg">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                loading={createPickup.isPending}
                className="flex-1"
                size="lg"
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
