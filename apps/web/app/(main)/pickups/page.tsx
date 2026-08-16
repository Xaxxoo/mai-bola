'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePickups } from '@/lib/hooks/use-pickups';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { TopBar } from '@/components/ui/top-bar';

const ACTIVE_STATUSES = ['PENDING', 'CLUSTERED', 'SCHEDULED', 'EN_ROUTE'];

type Tab = 'active' | 'history';

export default function PickupsPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [refreshing, setRefreshing] = useState(false);

  const activePickups = usePickups({ limit: 50 });
  const historyPickups = usePickups({ limit: 50 });

  const allPickups = (tab === 'active' ? activePickups : historyPickups).data?.data ?? [];
  const isLoading = (tab === 'active' ? activePickups : historyPickups).isLoading;

  const filtered =
    tab === 'active'
      ? allPickups.filter((p) => ACTIVE_STATUSES.includes(p.status))
      : allPickups.filter(
          (p) => p.status === 'COLLECTED' || p.status === 'CANCELLED',
        );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([activePickups.refetch(), historyPickups.refetch()]);
    setRefreshing(false);
  }, [activePickups, historyPickups]);

  return (
    <div>
      <TopBar
        title="Pickups"
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm text-forest font-semibold disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {(['active', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t
                ? 'border-forest text-forest'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t === 'active' ? 'Active' : 'History'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="rectangular" className="h-20 w-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
            title={tab === 'active' ? 'No active pickups' : 'No pickup history'}
            description={
              tab === 'active'
                ? 'Request a pickup to get started'
                : 'Your completed and cancelled pickups will appear here'
            }
            action={
              tab === 'active' ? (
                <Link href="/pickups/new">
                  <Button size="sm">Request pickup</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          filtered.map((pickup) => (
            <Link key={pickup.id} href={`/pickups/${pickup.id}`}>
              <Card padding="sm" className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">
                    {pickup.address?.streetText || pickup.address?.zone || 'Pickup'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{pickup.estimatedKg} kg</span>
                    <span>&middot;</span>
                    <span>
                      {new Date(pickup.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <StatusBadge type="pickup" status={pickup.status} />
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
