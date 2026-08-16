'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useRequestPayout } from '@/lib/hooks/use-wallet';
import { formatNaira } from '@/lib/format-money';
import { NIGERIAN_BANKS, MOBILE_MONEY_PROVIDERS } from '@/lib/nigerian-banks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TopBar } from '@/components/ui/top-bar';
import { useToast } from '@/components/ui/toast';
import { payoutAmountSchema, bankDestinationSchema, mobileDestinationSchema } from '@/lib/validation';

const MIN_PAYOUT = 1000;

type Step = 'amount' | 'method' | 'review' | 'success';
type Method = 'BANK_TRANSFER' | 'MOBILE_MONEY';

const STORAGE_KEY = 'mai-bola:last-payout-dest';

type SavedDest = {
  method: Method;
  bankCode?: string;
  accountNumber?: string;
  providerCode?: string;
  phone?: string;
};

function loadSavedDest(): SavedDest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDest(dest: SavedDest) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dest));
  } catch {}
}

const bankOptions = NIGERIAN_BANKS.map((b) => ({ value: b.code, label: b.name }));
const providerOptions = MOBILE_MONEY_PROVIDERS.map((p) => ({
  value: p.code,
  label: p.name,
}));

export default function WithdrawPage() {
  const router = useRouter();
  const { toast } = useToast();
  const wallet = useWallet();
  const requestPayout = useRequestPayout();

  const balance = parseFloat(wallet.data?.balance ?? '0');

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('BANK_TRANSFER');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [providerCode, setProviderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (wallet.isError) toast('Could not load your wallet balance', 'error');
  }, [wallet.isError, toast]);

  // Load saved destination on mount
  useEffect(() => {
    const saved = loadSavedDest();
    if (saved) {
      setMethod(saved.method);
      if (saved.bankCode) setBankCode(saved.bankCode);
      if (saved.accountNumber) setAccountNumber(saved.accountNumber);
      if (saved.providerCode) setProviderCode(saved.providerCode);
      if (saved.phone) setPhone(saved.phone);
    }
  }, []);

  const amountNum = parseFloat(amount) || 0;

  function validateAmount() {
    const errs: Record<string, string> = {};
    const result = payoutAmountSchema.safeParse({ amount: amountNum });
    if (!result.success) errs.amount = result.error.issues[0]?.message || 'Enter an amount';
    else if (amountNum > balance) errs.amount = `Exceeds your balance of ${formatNaira(balance)}`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateMethod() {
    const errs: Record<string, string> = {};
    const result = method === 'BANK_TRANSFER' ? bankDestinationSchema.safeParse({ bankCode, accountNumber }) : mobileDestinationSchema.safeParse({ providerCode, phone });
    if (!result.success) result.error.issues.forEach((issue) => { errs[method === 'BANK_TRANSFER' && issue.path[0] === 'bankCode' ? 'bank' : String(issue.path[0])] = issue.message; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleAmountNext() {
    if (validateAmount()) setStep('method');
  }

  function handleMethodNext() {
    if (validateMethod()) setStep('review');
  }

  function getDestination(): Record<string, unknown> {
    if (method === 'BANK_TRANSFER') {
      const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
      return {
        bankCode,
        bankName: bank?.name ?? bankCode,
        accountNumber,
      };
    }
    const provider = MOBILE_MONEY_PROVIDERS.find((p) => p.code === providerCode);
    return {
      providerCode,
      providerName: provider?.name ?? providerCode,
      phone,
    };
  }

  function getDestinationLabel(): string {
    if (method === 'BANK_TRANSFER') {
      const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
      return `${bank?.name ?? bankCode} · ****${accountNumber.slice(-4)}`;
    }
    const provider = MOBILE_MONEY_PROVIDERS.find((p) => p.code === providerCode);
    return `${provider?.name ?? providerCode} · ${phone}`;
  }

  async function handleSubmit() {
    try {
      await requestPayout.mutateAsync({
        amount: amountNum,
        method,
        destination: getDestination(),
      });

      // Persist destination for reuse
      saveDest(
        method === 'BANK_TRANSFER'
          ? { method, bankCode, accountNumber }
          : { method, providerCode, phone },
      );

      setStep('success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Withdrawal failed', 'error');
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {step !== 'success' && <TopBar title="Withdraw" back />}

      {/* Progress bar */}
      {step !== 'success' && (
        <div className="flex px-4 pt-3 gap-2">
          {(['amount', 'method', 'review'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ['amount', 'method', 'review'].indexOf(step)
                  ? 'bg-forest'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1 px-4 pt-4 pb-6">
        {/* Step 1: Amount */}
        {step === 'amount' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-heading font-bold text-text">
                How much?
              </h2>
              <p className="text-sm text-muted mt-1">
                Available:{' '}
                {wallet.isLoading
                  ? 'Loading…'
                  : wallet.isError
                    ? 'Unavailable'
                    : formatNaira(balance)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">
                  ₦
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl border bg-white pl-9 pr-16 py-4 text-2xl font-bold text-text placeholder:text-gray-300 transition-colors ${
                    errors.amount
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-green-500'
                  }`}
                />
                <button
                  onClick={() => setAmount(String(balance))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-tint px-2.5 py-1 text-xs font-semibold text-forest"
                >
                  MAX
                </button>
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}
              <p className="text-xs text-muted">
                Minimum withdrawal: {formatNaira(MIN_PAYOUT)}
              </p>
            </div>

            <Button
              onClick={handleAmountNext}
              className="w-full"
              size="lg"
              disabled={wallet.isLoading || wallet.isError}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Method */}
        {step === 'method' && (
          <div className="space-y-5">
            <h2 className="text-xl font-heading font-bold text-text">
              Where to?
            </h2>

            {/* Method toggle */}
            <div className="flex gap-2">
              {([
                { value: 'BANK_TRANSFER' as Method, label: 'Bank Transfer' },
                { value: 'MOBILE_MONEY' as Method, label: 'Mobile Money' },
              ]).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                    method === m.value
                      ? 'bg-forest text-white'
                      : 'bg-white border border-gray-200 text-text hover:border-green-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {method === 'BANK_TRANSFER' ? (
              <div className="space-y-3">
                <Select
                  label="Bank"
                  options={bankOptions}
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  placeholder="Select your bank"
                  error={errors.bank}
                />
                <Input
                  label="Account number"
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="0123456789"
                  inputMode="numeric"
                  maxLength={10}
                  error={errors.account}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <Select
                  label="Provider"
                  options={providerOptions}
                  value={providerCode}
                  onChange={(e) => setProviderCode(e.target.value)}
                  placeholder="Select provider"
                  error={errors.provider}
                />
                <Input
                  label="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="080XXXXXXXX"
                  inputMode="tel"
                  error={errors.phone}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep('amount')}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button onClick={handleMethodNext} className="flex-1" size="lg">
                Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-5">
            <h2 className="text-xl font-heading font-bold text-text">
              Review withdrawal
            </h2>

            <Card>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Amount</span>
                  <span className="text-xl font-bold text-forest">
                    {formatNaira(amountNum)}
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Method</span>
                  <span className="font-medium text-text">
                    {method === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Destination</span>
                  <span className="font-medium text-text text-right max-w-[200px]">
                    {getDestinationLabel()}
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Balance after</span>
                  <span className="font-medium text-text">
                    {formatNaira(balance - amountNum)}
                  </span>
                </div>
              </div>
            </Card>

            <p className="text-xs text-muted text-center">
              Withdrawals are typically processed within 24 hours on business days.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep('method')}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                loading={requestPayout.isPending}
                className="flex-1"
                size="lg"
              >
                Withdraw
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-heading font-bold text-text">
              Withdrawal requested
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[280px]">
              Your withdrawal of {formatNaira(amountNum)} has been submitted.
              Expect it to be processed within 24 hours on business days.
            </p>
            <div className="mt-2 text-xs text-muted">
              <p>
                {method === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'} &middot;{' '}
                {getDestinationLabel()}
              </p>
            </div>
            <div className="mt-8 w-full space-y-3">
              <Button
                onClick={() => router.push('/wallet')}
                className="w-full"
                size="lg"
              >
                Back to Wallet
              </Button>
              <button
                onClick={() => router.push('/')}
                className="w-full text-center text-sm text-muted hover:text-text transition-colors"
              >
                Go home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
