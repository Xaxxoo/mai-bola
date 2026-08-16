'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDriverToday, useStartDriverRoute } from '@/lib/hooks/use-driver';
import { formatNaira } from '@/lib/format-money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

export default function DriverPage() {
  const today = useDriverToday();
  const startRoute = useStartDriverRoute();
  const { toast } = useToast();
  const [startingId, setStartingId] = useState<string | null>(null);
  const route = today.data?.[0];

  async function handleStart() {
    if (!route) return;
    setStartingId(route.id);
    try {
      await startRoute.mutateAsync(route.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not start route', 'error');
    } finally {
      setStartingId(null);
    }
  }

  if (today.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rectangular" className="h-52 w-full" />
        <Skeleton variant="rectangular" className="h-16 w-full" />
      </div>
    );
  }

  if (today.isError || !route) {
    return (
      <EmptyState
        title="No route assigned today"
        description={today.isError ? 'We could not load your route. Check your connection and try again.' : 'Your dispatcher will add a route here when one is ready.'}
      />
    );
  }

  const isStarted = route.status === 'IN_PROGRESS';
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-forest text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-green-200">Today’s route</p>
            <h1 className="mt-1 text-2xl font-heading font-bold">{route.name}</h1>
            <p className="mt-1 text-sm text-green-100">{route.zone}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
            <p className="text-2xl font-bold">{route.stops.length}</p>
            <p className="text-[10px] text-green-100">stops</p>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs text-green-200">Estimated load</p>
            <p className="text-xl font-bold">{route.estimatedTotalKg.toLocaleString()} kg</p>
          </div>
          {isStarted ? (
            <Link href={`/driver/route?routeId=${route.id}`}>
              <Button variant="secondary" className="border-white/30 bg-white/15 text-white hover:bg-white/25">
                Continue route
              </Button>
            </Link>
          ) : (
            <Button
              variant="secondary"
              loading={startingId === route.id}
              onClick={handleStart}
              className="border-white/30 bg-white text-forest hover:bg-green-50"
            >
              Start route
            </Button>
          )}
        </div>
      </Card>

      <Card padding="sm" className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Rate per kg</p>
          <p className="text-xs text-muted">Confirm actual weight at every stop</p>
        </div>
        <p className="text-lg font-bold text-forest">{formatNaira(120)}/kg</p>
      </Card>
    </div>
  );
}
