'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useCompleteDriverRoute,
  useDriverAction,
  useDriverRoute,
  useStartDriverRoute,
} from '@/lib/hooks/use-driver';
import type { DriverStop } from '@/lib/driver-offline';
import { formatNaira } from '@/lib/format-money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

const skipReasons = [
  { value: 'Nobody home', label: 'Nobody home' },
  { value: 'Unsafe access', label: 'Unsafe access' },
  { value: 'Waste not ready', label: 'Waste not ready' },
  { value: 'Address not found', label: 'Address not found' },
];

function addressText(stop: DriverStop) {
  const address = stop.pickupRequest.address;
  return [address.streetText, address.area].filter(Boolean).join(', ');
}

function StopCard({
  stop,
  active,
  onSelect,
}: {
  stop: DriverStop;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="block w-full text-left">
      <Card className={active ? 'border-2 border-green-500 ring-1 ring-green-100' : 'border border-transparent'}>
        <div className="flex items-start gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${stop.status === 'COLLECTED' ? 'bg-green-100 text-green-700' : stop.status === 'SKIPPED' ? 'bg-gray-100 text-gray-500' : active ? 'bg-forest text-white' : 'bg-tint text-forest'}`}>
            {stop.status === 'COLLECTED' ? '✓' : stop.status === 'SKIPPED' ? '–' : stop.stopOrder}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-text">{stop.supplier.fullName}</span>
              <span className="shrink-0 text-xs font-medium text-muted">{stop.estimatedKg} kg est.</span>
            </span>
            <span className="mt-1 block truncate text-xs text-muted">{addressText(stop)}</span>
            <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-muted">{stop.status}</span>
          </span>
        </div>
      </Card>
    </button>
  );
}

function Keypad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          type="button"
          key={key}
          onClick={() => {
            if (key === '⌫') return onChange(value.slice(0, -1));
            if (key === '.' && value.includes('.')) return;
            onChange(`${value}${key}`.replace(/^0+(?=\d)/, ''));
          }}
          className="h-12 rounded-xl bg-white text-lg font-semibold text-text shadow-sm active:bg-tint"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export default function DriverRoutePage() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get('routeId') || '';
  const routeQuery = useDriverRoute(routeId);
  const action = useDriverAction();
  const start = useStartDriverRoute();
  const complete = useCompleteDriverRoute();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kg, setKg] = useState('');
  const [skipReason, setSkipReason] = useState('Nobody home');

  const route = routeQuery.data;
  const selected = route?.stops.find((stop) => stop.id === selectedId) ||
    route?.stops.find((stop) => stop.status === 'ARRIVED') ||
    route?.stops.find((stop) => stop.status === 'PENDING');
  const done = route?.stops.every((stop) => stop.status === 'COLLECTED' || stop.status === 'SKIPPED');
  const totalKg = useMemo(() => route?.stops.reduce((sum, stop) => sum + Number(stop.collection?.actualKg || 0), 0) || 0, [route]);
  const totalPaid = useMemo(() => route?.stops.reduce((sum, stop) => sum + Number(stop.collection?.amountPaid || 0), 0) || 0, [route]);

  async function perform(kind: 'arrive' | 'collect' | 'skip', payload: Record<string, unknown> = {}) {
    if (!route || !selected) return;
    try {
      const result = await action.mutateAsync({ routeId: route.id, stopId: selected.id, kind, payload });
      if (result.queued) toast('Saved offline — will sync when you’re back online', 'info');
      if (kind === 'collect') setKg('');
      setSelectedId(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Action failed', 'error');
    }
  }

  async function completeRoute() {
    if (!route) return;
    try {
      await complete.mutateAsync(route.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not complete route', 'error');
    }
  }

  if (routeQuery.isLoading) {
    return <div className="space-y-3"><Skeleton variant="rectangular" className="h-36 w-full" /><Skeleton variant="rectangular" className="h-20 w-full" /><Skeleton variant="rectangular" className="h-20 w-full" /></div>;
  }
  if (routeQuery.isError || !route) {
    return <Card><p className="text-sm text-red-600">Route unavailable. Open this page once while online to cache the manifest.</p></Card>;
  }
  if (route.status === 'COMPLETED') {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">✓</div>
        <div><h1 className="text-2xl font-heading font-bold text-text">Route complete</h1><p className="mt-1 text-sm text-muted">{route.name} · {route.zone}</p></div>
        <div className="grid grid-cols-3 gap-2 text-left">
          <Card padding="sm"><p className="text-xl font-bold text-forest">{route.stops.filter((stop) => stop.status === 'COLLECTED').length}</p><p className="text-[10px] text-muted">stops served</p></Card>
          <Card padding="sm"><p className="text-xl font-bold text-forest">{totalKg.toLocaleString()}</p><p className="text-[10px] text-muted">kg collected</p></Card>
          <Card padding="sm"><p className="text-xl font-bold text-forest">{formatNaira(totalPaid)}</p><p className="text-[10px] text-muted">paid out</p></Card>
        </div>
      </div>
    );
  }

  const actualKg = Number(kg);
  return (
    <div className="space-y-4">
      {route.status === 'DISPATCHED' && (
        <Card className="border border-green-100 bg-tint">
          <p className="text-sm text-text">This route is ready to go.</p>
          <Button className="mt-3 w-full" loading={start.isPending} onClick={() => start.mutateAsync(route.id).catch((error) => toast(error instanceof Error ? error.message : 'Could not start route', 'error'))}>Start route</Button>
        </Card>
      )}
      <div className="space-y-2">
        {route.stops.map((stop) => <StopCard key={stop.id} stop={stop} active={selected?.id === stop.id} onSelect={() => { setSelectedId(stop.id); if (stop.status !== 'ARRIVED') setKg(''); }} />)}
      </div>

      {selected && selected.status !== 'COLLECTED' && selected.status !== 'SKIPPED' && (
        <Card className="sticky bottom-3 border-2 border-green-100 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted">Stop {selected.stopOrder}</p><h2 className="text-lg font-heading font-bold text-text">{selected.supplier.fullName}</h2><p className="text-xs text-muted">{addressText(selected)}</p></div>
            <div className="flex gap-2"><a className="rounded-lg bg-tint px-2.5 py-2 text-xs font-semibold text-forest" href={`tel:${selected.supplier.phone}`}>Call</a><a className="rounded-lg bg-tint px-2.5 py-2 text-xs font-semibold text-forest" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${selected.pickupRequest.address.lat},${selected.pickupRequest.address.lng}`}>Maps</a></div>
          </div>
          {selected.status === 'PENDING' ? (
            <Button className="w-full" loading={action.isPending} onClick={() => perform('arrive')}>Arrive at stop</Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-tint p-3 text-center"><p className="text-xs text-muted">Actual weight (kg)</p><p className="text-3xl font-bold text-forest">{kg || '0'}</p><p className="mt-1 text-sm text-muted">Payment: <span className="font-bold text-forest">{formatNaira(actualKg * 120)}</span></p></div>
              <Keypad value={kg} onChange={setKg} />
              <Button className="w-full" disabled={!actualKg || actualKg <= 0} loading={action.isPending} onClick={() => perform('collect', { actualKg })}>Confirm & collect</Button>
            </div>
          )}
          <div className="mt-3 flex items-end gap-2 border-t border-gray-100 pt-3"><div className="min-w-0 flex-1"><Select label="Skip reason" options={skipReasons} value={skipReason} onChange={(event) => setSkipReason(event.target.value)} /></div><Button variant="ghost" loading={action.isPending} onClick={() => perform('skip', { reason: skipReason })}>Skip</Button></div>
        </Card>
      )}
      {done && route.status === 'IN_PROGRESS' && <Button className="w-full" size="lg" loading={complete.isPending} onClick={completeRoute}>Complete route</Button>}
    </div>
  );
}
