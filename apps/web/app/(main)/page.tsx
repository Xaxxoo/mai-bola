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

export default function HomePage() {
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
