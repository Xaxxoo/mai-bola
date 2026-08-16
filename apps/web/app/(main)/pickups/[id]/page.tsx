'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePickup, useCancelPickup } from '@/lib/hooks/use-pickups';
import { formatNaira } from '@/lib/format-money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { StatusStepper } from '@/components/ui/status-stepper';
import { TopBar } from '@/components/ui/top-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

const PRICE_PER_KG = 120;

// Statuses that allow cancellation (PENDING and CLUSTERED — before scheduling)
const CANCELLABLE = ['PENDING', 'CLUSTERED'];

const STATUS_TIMELINE: Record<string, { label: string; description: string }> = {
  PENDING: { label: 'Requested', description: 'Your pickup request has been submitted' },
  CLUSTERED: { label: 'Processing', description: 'Your request is being grouped with nearby pickups' },
  SCHEDULED: { label: 'Scheduled', description: 'A driver has been assigned to your route' },
  EN_ROUTE: { label: 'On the way', description: 'Your driver is heading to your location' },
  COLLECTED: { label: 'Collected', description: 'Your bottles have been picked up and weighed' },
  CANCELLED: { label: 'Cancelled', description: 'This pickup was cancelled' },
};

// Order for timeline display
const STATUS_ORDER = ['PENDING', 'CLUSTERED', 'SCHEDULED', 'EN_ROUTE', 'COLLECTED'];

function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status);
}

export default function PickupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const pickup = usePickup(id);
  const cancelMutation = useCancelPickup();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const data = pickup.data;
  const isCancelled = data?.status === 'CANCELLED';
  const isCollected = data?.status === 'COLLECTED';
  const canCancel = data ? CANCELLABLE.includes(data.status) : false;
  const currentIndex = data ? getStatusIndex(data.status) : -1;

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync({ id, reason: cancelReason || undefined });
      toast('Pickup cancelled', 'success');
      setShowCancelConfirm(false);
      pickup.refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    }
  }

  if (pickup.isLoading) {
    return (
      <div>
        <TopBar title="Pickup Details" back />
        <div className="px-4 pt-4 space-y-4">
          <Skeleton variant="rectangular" className="h-24 w-full" />
          <Skeleton variant="rectangular" className="h-32 w-full" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (pickup.isError || !data) {
    return (
      <div>
        <TopBar title="Pickup Details" back />
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-red-500 mb-4">
            {pickup.error instanceof Error ? pickup.error.message : 'Failed to load pickup'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => pickup.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Pickup Details" back />

      <div className="px-4 pt-4 space-y-4">
        {/* Status + stepper */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">Status</h2>
            <StatusBadge type="pickup" status={data.status} />
          </div>
          {!isCancelled && <StatusStepper status={data.status} />}
          {isCancelled && data.cancelledReason && (
            <p className="mt-2 text-xs text-muted">
              Reason: {data.cancelledReason}
            </p>
          )}
        </Card>

        {/* Details */}
        <Card>
          <h2 className="text-sm font-semibold text-text mb-3">Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Estimated</span>
              <span className="font-medium text-text">{data.estimatedKg} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Est. payout</span>
              <span className="font-medium text-text">
                {formatNaira(data.estimatedKg * PRICE_PER_KG)}
              </span>
            </div>
            {data.address && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Location</span>
                <span className="font-medium text-text text-right max-w-[200px]">
                  {data.address.streetText}, {data.address.zone}
                </span>
              </div>
            )}
            {data.note && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Note</span>
                <span className="font-medium text-text text-right max-w-[200px]">
                  {data.note}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Requested</span>
              <span className="font-medium text-text">
                {new Date(data.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </Card>

        {/* Collection result — shown when collected */}
        {isCollected && (
          <Card className="bg-tint border border-green-100">
            <h2 className="text-sm font-semibold text-text mb-3">
              Collection Result
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Your estimate</span>
                <span className="text-text">{data.estimatedKg} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Actual weight</span>
                <span className="font-bold text-forest">
                  Weighed at collection
                </span>
              </div>
              <p className="text-xs text-muted pt-1">
                The actual kg and credited amount are shown in your wallet transactions.
              </p>
            </div>
          </Card>
        )}

        {/* Photos */}
        {data.photoUrls.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-text mb-3">Photos</h2>
            <div className="flex gap-2 flex-wrap">
              {data.photoUrls.map((url, i) => (
                <div
                  key={i}
                  className="h-20 w-20 rounded-lg overflow-hidden border border-gray-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <h2 className="text-sm font-semibold text-text mb-3">Timeline</h2>
          <div className="space-y-0">
            {(isCancelled
              ? [...STATUS_ORDER.slice(0, Math.max(currentIndex, 0) + 1), 'CANCELLED']
              : STATUS_ORDER.slice(0, currentIndex + 1)
            ).reverse().map((status, i, arr) => {
              const info = STATUS_TIMELINE[status];
              const isFirst = i === 0;
              const isLast = i === arr.length - 1;

              return (
                <div key={status} className="flex gap-3">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isFirst
                          ? status === 'CANCELLED'
                            ? 'bg-red-400'
                            : 'bg-forest'
                          : 'bg-green-300'
                      }`}
                    />
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gray-200 min-h-[24px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4">
                    <p className={`text-sm font-medium ${isFirst ? 'text-text' : 'text-muted'}`}>
                      {info?.label || status}
                    </p>
                    <p className="text-xs text-muted">
                      {info?.description || ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cancel button */}
        {canCancel && !showCancelConfirm && (
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:bg-red-50"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel this pickup
          </Button>
        )}

        {showCancelConfirm && (
          <Card className="border border-red-200">
            <p className="text-sm font-semibold text-text mb-2">Cancel pickup?</p>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Keep it
              </Button>
              <Button
                size="sm"
                loading={cancelMutation.isPending}
                onClick={handleCancel}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Cancel pickup
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
