'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/lib/hooks/use-wallet';
import { usePickups } from '@/lib/hooks/use-pickups';
import { usePublicMetrics } from '@/lib/hooks/use-metrics';
import { formatNaira } from '@/lib/format-money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { StatusStepper } from '@/components/ui/status-stepper';
import { Skeleton } from '@/components/ui/skeleton';

const OPEN_STATUSES = ['PENDING', 'CLUSTERED', 'SCHEDULED', 'EN_ROUTE'];
const MAX_OPEN = 3;

function DashboardHome() {
  const { user } = useAuth();
  const wallet = useWallet();
  const pickups = usePickups({ limit: 10 });
  const metrics = usePublicMetrics();

  const allPickups = pickups.data?.data ?? [];
  const activePickups = allPickups.filter((p) =>
    OPEN_STATUSES.includes(p.status),
  );
  const openCount = activePickups.length;
  const canRequest = openCount < MAX_OPEN;
  const latestActive = activePickups[0];

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="text-2xl font-heading font-bold text-text">
          {firstName}
        </h1>
      </div>

      {/* Wallet balance card */}
      <Card className="bg-forest text-white">
        <p className="text-xs text-green-200">Wallet Balance</p>
        {wallet.isLoading ? (
          <Skeleton variant="text" className="mt-1 w-32 h-8 bg-green-800" />
        ) : (
          <p className="mt-1 text-3xl font-bold">
            {formatNaira(wallet.data?.balance ?? '0')}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-green-200">
          <span>Earned: {wallet.isLoading ? '...' : formatNaira(wallet.data?.totalEarned ?? '0')}</span>
          <span>Paid out: {wallet.isLoading ? '...' : formatNaira(wallet.data?.totalPaidOut ?? '0')}</span>
        </div>
      </Card>

      {/* Request pickup CTA */}
      <div>
        {canRequest ? (
          <Link href="/pickups/new">
            <Button className="w-full" size="lg">
              Request pickup
            </Button>
          </Link>
        ) : (
          <div className="space-y-2">
            <Button className="w-full" size="lg" disabled>
              Request pickup
            </Button>
            <p className="text-center text-xs text-muted">
              You have {openCount} open requests (max {MAX_OPEN}). Complete or cancel one first.
            </p>
          </div>
        )}
      </div>

      {/* Active request card */}
      {latestActive && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text">Active Request</h2>
          <Link href={`/pickups/${latestActive.id}`}>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">
                    {latestActive.address?.zone || 'Pickup'} &middot; {latestActive.estimatedKg} kg
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(latestActive.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <StatusBadge type="pickup" status={latestActive.status} />
              </div>
              <StatusStepper status={latestActive.status} />
            </Card>
          </Link>
        </section>
      )}

      {/* Community impact */}
      {metrics.data && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text">
            Community Impact
          </h2>
          <div className="flex gap-3">
            <Card padding="sm" className="flex-1 text-center">
              <p className="text-lg font-bold text-forest">
                {metrics.data.tonnesRecovered}
              </p>
              <p className="text-[10px] text-muted leading-tight">
                tonnes recovered
              </p>
            </Card>
            <Card padding="sm" className="flex-1 text-center">
              <p className="text-lg font-bold text-forest">
                {formatNaira(metrics.data.paidToSuppliers)}
              </p>
              <p className="text-[10px] text-muted leading-tight">
                paid to suppliers
              </p>
            </Card>
            <Card padding="sm" className="flex-1 text-center">
              <p className="text-lg font-bold text-forest">
                {metrics.data.activeSuppliers}
              </p>
              <p className="text-[10px] text-muted leading-tight">
                active suppliers
              </p>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

function BottleIllustration() {
  return (
    <svg viewBox="0 0 420 420" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="bottle" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#D8F3DC" />
          <stop offset="1" stopColor="#83C99A" />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <circle cx="215" cy="208" r="144" fill="#D8F3DC" opacity=".12" />
      <circle cx="218" cy="211" r="94" fill="#D8F3DC" opacity=".1" filter="url(#soft)" />
      <path d="M130 326c30-31 53-43 85-43 34 0 60 12 88 43" fill="none" stroke="#D8F3DC" strokeLinecap="round" strokeWidth="7" opacity=".7" />
      <path d="M165 126h106l-11 45v117c0 16-13 29-29 29h-26c-16 0-29-13-29-29V171l-11-45Z" fill="url(#bottle)" stroke="#D8F3DC" strokeWidth="5" />
      <path d="M181 126h74V93c0-10-8-18-18-18h-38c-10 0-18 8-18 18v33Z" fill="#83C99A" stroke="#D8F3DC" strokeWidth="5" />
      <path d="M176 112h84" stroke="#14342B" strokeLinecap="round" strokeWidth="7" opacity=".7" />
      <path d="M179 200c31 18 63 18 78 0" fill="none" stroke="#14342B" strokeLinecap="round" strokeWidth="5" opacity=".35" />
      <path d="M192 228h52" stroke="#14342B" strokeLinecap="round" strokeWidth="5" opacity=".35" />
      <path d="M192 247h33" stroke="#14342B" strokeLinecap="round" strokeWidth="5" opacity=".35" />
      <path d="M113 113c-7-29 5-53 30-65-2 23 6 37 27 46-15 25-35 31-57 19Z" fill="#83C99A" />
      <path d="M310 120c12-25 34-35 59-29-15 15-17 30-10 49-25 7-42 0-49-20Z" fill="#D8F3DC" />
      <path d="M130 91c13 26 29 43 51 51M310 119c-17 13-29 29-36 50" stroke="#D8F3DC" strokeLinecap="round" strokeWidth="4" opacity=".8" />
      <circle cx="104" cy="275" r="7" fill="#D8F3DC" /><circle cx="315" cy="78" r="5" fill="#83C99A" /><circle cx="327" cy="286" r="4" fill="#D8F3DC" />
    </svg>
  );
}

function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#f7faf8] text-forest">
      <section className="relative bg-forest">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#83c99a_1px,transparent_1px)] [background-size:24px_24px]" />
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2 text-white" aria-label="Mai Bola home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-lg font-black text-forest">M</span>
            <span className="font-heading text-xl font-bold tracking-tight">mai bola</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/login" className="rounded-full px-4 py-2 text-green-100 transition hover:bg-white/10 hover:text-white">Sign in</Link>
            <Link href="/register" className="rounded-full bg-mint px-4 py-2 text-forest transition hover:bg-white">Get started</Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-300/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.18em] text-green-100"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> Kaduna, Nigeria</p>
            <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">Waste has value.<br /><span className="text-mint">Let’s unlock it.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-green-100/85">Mai Bola makes it simple to recover PET bottles, keep Kaduna cleaner, and earn fairly for every kilogram you collect.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-mint px-6 py-3.5 text-sm font-bold text-forest shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white">Start earning <span className="ml-2 text-lg">→</span></Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">I already have an account</Link>
            </div>
            <div className="mt-10 flex items-center gap-3 text-xs text-green-100/70"><div className="flex -space-x-2"><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-forest bg-[#e7bd8e] text-xs">A</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-forest bg-[#9fc8a3] text-xs">K</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-forest bg-[#d2a77d] text-xs">N</span></div><span>Join a growing community of local recyclers</span></div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[430px] lg:ml-auto"><div className="absolute inset-8 rounded-[42%] bg-[#2d6a4f] shadow-2xl shadow-black/20" /><div className="relative h-full w-full"><BottleIllustration /></div><div className="absolute bottom-8 left-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md"><p className="text-[10px] uppercase tracking-widest text-green-100">Current rate</p><p className="mt-1 text-xl font-bold">₦120 <span className="text-xs font-normal text-green-100">/ kg</span></p></div><div className="absolute right-1 top-14 rounded-2xl bg-mint px-4 py-3 text-forest shadow-xl"><p className="text-[10px] uppercase tracking-widest text-green-700">Impact so far</p><p className="mt-1 text-xl font-bold">Cleaner Kaduna</p></div></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-10 rounded-t-[50%] bg-[#f7faf8]" />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">A better loop</p><h2 className="mt-3 max-w-md font-heading text-4xl font-bold leading-tight text-forest sm:text-5xl">Small actions.<br />Real change.</h2></div><p className="max-w-xl text-lg leading-8 text-muted">From the bottle in your hand to a cleaner street around you, we connect everyday recovery to reliable pickup, transparent weighing, and money in your wallet.</p></div><div className="mt-14 grid gap-5 md:grid-cols-3"><div className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(20,52,43,.06)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-xl">01</span><h3 className="mt-7 font-heading text-2xl font-bold">Collect</h3><p className="mt-3 text-sm leading-6 text-muted">Save your PET bottles at home, work, or wherever you find them.</p></div><div className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(20,52,43,.06)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f0df] text-xl">02</span><h3 className="mt-7 font-heading text-2xl font-bold">Request a pickup</h3><p className="mt-3 text-sm leading-6 text-muted">Choose a convenient time and our local driver comes to you.</p></div><div className="rounded-3xl bg-forest p-7 text-white shadow-[0_10px_40px_rgba(20,52,43,.15)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-xl text-forest">03</span><h3 className="mt-7 font-heading text-2xl font-bold">Get paid</h3><p className="mt-3 text-sm leading-6 text-green-100">We weigh what you recover and credit your Mai Bola wallet fairly.</p></div></div></section>

      <section className="border-y border-green-100 bg-[#edf7ee]"><div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3 lg:px-10 lg:py-20"><div><p className="font-heading text-4xl font-bold text-forest">₦120</p><p className="mt-2 text-sm text-muted">per kilogram collected</p></div><div><p className="font-heading text-4xl font-bold text-forest">0%</p><p className="mt-2 text-sm text-muted">cost to request a pickup</p></div><div><p className="font-heading text-4xl font-bold text-forest">1 app</p><p className="mt-2 text-sm text-muted">to collect, track, and cash out</p></div></div></section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-28"><div className="relative overflow-hidden rounded-[2rem] bg-forest px-7 py-12 text-center sm:px-12"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-mint/10" /><div className="absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-[#83c99a]/10" /><div className="relative"><p className="text-sm font-bold uppercase tracking-[.18em] text-green-200">Ready when you are</p><h2 className="mx-auto mt-4 max-w-2xl font-heading text-4xl font-bold text-white sm:text-5xl">Turn your next bag of bottles into something bigger.</h2><Link href="/register" className="mt-8 inline-flex rounded-xl bg-mint px-7 py-3.5 text-sm font-bold text-forest transition hover:bg-white">Create your free account <span className="ml-2">→</span></Link></div></div></section>
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 pb-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-heading font-bold text-forest">mai bola</span><span>Building a cleaner Kaduna, one bottle at a time.</span></footer>
    </main>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <LandingPage />;
  if (loading && !user) return <LandingPage />;
  return <DashboardHome />;
}
