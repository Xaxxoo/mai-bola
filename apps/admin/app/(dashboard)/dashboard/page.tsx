'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format-money';
import { DashboardCharts } from '@/components/dashboard-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';

type Overview = { tonnesRecovered: number; paidToSuppliers: number; tonnesSold: number; lifetimeContribution: number; activeSuppliers: number; truckloadEquivalents: number };
type Point = { date: string; value: number };

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [collected, setCollected] = useState<Point[]>([]);
  const [paid, setPaid] = useState<Point[]>([]);
  const [error, setError] = useState('');
  const load = () => { setError(''); Promise.all([api<Overview>('/admin/metrics/overview'), api<Point[]>('/admin/metrics/timeseries?metric=kg_collected&interval=week'), api<Point[]>('/admin/metrics/timeseries?metric=naira_paid&interval=week')]).then(([summary, kg, naira]) => { setOverview(summary); setCollected(kg); setPaid(naira); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard')); };
  useEffect(load, []);
  if (error) return <div className="rounded-2xl bg-white p-8"><p className="text-red-600">{error}</p><Button className="mt-4" onClick={load}>Try again</Button></div>;
  return <div className="space-y-8"><div><p className="text-sm text-muted">Overview</p><h1 className="mt-1 text-3xl font-heading font-bold text-text">Good morning</h1></div><div className="grid grid-cols-3 gap-5">{overview ? <><StatCard label="Tonnes recovered" value={overview.tonnesRecovered.toLocaleString()} detail="Lifetime collection" icon="♻" /><StatCard label="Paid to suppliers" value={formatNaira(overview.paidToSuppliers)} detail="Lifetime supplier earnings" icon="₦" tone="mint" /><StatCard label="Tonnes sold" value={overview.tonnesSold.toLocaleString()} detail="Material sold" icon="↗" /><StatCard label="Contribution" value={formatNaira(overview.lifetimeContribution)} detail="Lifetime contribution" icon="✦" tone="mint" /><StatCard label="Active suppliers" value={overview.activeSuppliers.toLocaleString()} detail="Currently active" icon="♙" /><StatCard label="Truckload equivalents" value={overview.truckloadEquivalents.toLocaleString()} detail="At 20 tonnes per truckload" icon="▣" tone="amber" /></> : Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>{overview && <DashboardCharts collected={collected} paid={paid} />}</div>;
}
