'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  useWallet,
  useTransactions,
  useMyPayouts,
  useCancelPayout,
} from '@/lib/hooks/use-wallet';
import type { WalletTransaction } from '@/lib/hooks/use-wallet';
import { formatNaira } from '@/lib/format-money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

function groupByMonth(
  pages: { data: WalletTransaction[] }[],
): Record<string, WalletTransaction[]> {
  const groups: Record<string, WalletTransaction[]> = {};
  for (const page of pages) {
    for (const tx of page.data) {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    }
  }
  return groups;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

function txLabel(tx: WalletTransaction): string {
  if (tx.type === 'CREDIT_COLLECTION') return 'Pickup collected';
  if (tx.type === 'DEBIT_PAYOUT') return 'Withdrawal';
  return tx.note || 'Adjustment';
}

export default function WalletPage() {
  const { toast } = useToast();
  const wallet = useWallet();
  const txQuery = useTransactions(20);
  const payouts = useMyPayouts();
  const cancelPayout = useCancelPayout();

  useEffect(() => {
    if (wallet.isError) toast('Could not load your wallet', 'error');
  }, [wallet.isError, toast]);

  useEffect(() => {
    if (txQuery.isError) toast('Could not load transactions', 'error');
  }, [txQuery.isError, toast]);

  useEffect(() => {
    if (payouts.isError) toast('Could not load payout status', 'error');
  }, [payouts.isError, toast]);

  const pendingPayout = payouts.data?.find(
    (p) => p.status === 'REQUESTED' || p.status === 'APPROVED',
  );

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (
        entries[0]?.isIntersecting &&
        txQuery.hasNextPage &&
        !txQuery.isFetchingNextPage
      ) {
        txQuery.fetchNextPage();
      }
    },
    [txQuery],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const groups = txQuery.data ? groupByMonth(txQuery.data.pages) : {};
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  async function handleCancelPayout(id: string) {
    try {
      await cancelPayout.mutateAsync(id);
      toast('Payout cancelled — funds returned to wallet', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    }
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Balance hero */}
      <Card className="bg-forest text-white overflow-hidden relative">
        {/* Mint accent circle */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green-600/30" />
        <div className="absolute -right-2 -bottom-4 h-16 w-16 rounded-full bg-mint/10" />
        <div className="relative">
          <p className="text-xs text-green-200">Available Balance</p>
          {wallet.isLoading ? (
            <Skeleton variant="text" className="mt-1 w-40 h-10 bg-green-800" />
          ) : wallet.isError ? (
            <p className="mt-2 text-sm text-green-100">Balance unavailable</p>
          ) : (
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {formatNaira(wallet.data?.balance ?? '0')}
            </p>
          )}
          <div className="mt-4">
            <Link href="/wallet/withdraw">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 border-white/30 text-white hover:bg-white/25"
              >
                Withdraw
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Totals row */}
      <div className="flex gap-3">
        <Card padding="sm" className="flex-1">
          <p className="text-[10px] text-muted uppercase tracking-wide">
            Lifetime Earned
          </p>
          {wallet.isLoading ? (
            <Skeleton variant="text" className="mt-1 w-20 h-5" />
          ) : wallet.isError ? (
            <p className="mt-1 text-sm text-red-500">Unavailable</p>
          ) : (
            <p className="mt-1 text-base font-bold text-text">
              {formatNaira(wallet.data?.totalEarned ?? '0')}
            </p>
          )}
        </Card>
        <Card padding="sm" className="flex-1">
          <p className="text-[10px] text-muted uppercase tracking-wide">
            Total Withdrawn
          </p>
          {wallet.isLoading ? (
            <Skeleton variant="text" className="mt-1 w-20 h-5" />
          ) : wallet.isError ? (
            <p className="mt-1 text-sm text-red-500">Unavailable</p>
          ) : (
            <p className="mt-1 text-base font-bold text-text">
              {formatNaira(wallet.data?.totalPaidOut ?? '0')}
            </p>
          )}
        </Card>
      </div>

      {/* Pending payout banner */}
      {pendingPayout && (
        <Card className="border border-yellow-200 bg-yellow-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-yellow-800">
                {pendingPayout.status === 'REQUESTED'
                  ? 'Withdrawal pending'
                  : 'Withdrawal approved'}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {formatNaira(pendingPayout.amount)} via{' '}
                {pendingPayout.method === 'BANK_TRANSFER'
                  ? 'bank transfer'
                  : 'mobile money'}
              </p>
            </div>
            {pendingPayout.status === 'REQUESTED' && (
              <Button
                variant="ghost"
                size="sm"
                loading={cancelPayout.isPending}
                onClick={() => handleCancelPayout(pendingPayout.id)}
                className="text-yellow-800 hover:bg-yellow-100 shrink-0"
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Transactions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">Transactions</h2>

        {txQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-14 w-full" />
            ))}
          </div>
        ) : sortedKeys.length === 0 ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
            title="No transactions yet"
            description="Your pickup earnings and withdrawals will appear here"
          />
        ) : (
          <div className="space-y-4">
            {sortedKeys.map((key) => (
              <div key={key}>
                <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">
                  {monthLabel(key)}
                </p>
                <div className="space-y-1">
                  {groups[key].map((tx) => {
                    const isCredit = Number(tx.amount) > 0;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isCredit
                                ? 'bg-green-100 text-green-600'
                                : 'bg-red-50 text-red-400'
                            }`}
                          >
                            {isCredit ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="7 13 12 8 17 13" />
                                <line x1="12" y1="8" x2="12" y2="20" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="7 11 12 16 17 11" />
                                <line x1="12" y1="16" x2="12" y2="4" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text truncate">
                              {txLabel(tx)}
                            </p>
                            <p className="text-[10px] text-muted">
                              {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold whitespace-nowrap ${
                            isCredit ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatNaira(Math.abs(Number(tx.amount)))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {txQuery.isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <svg className="h-5 w-5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
