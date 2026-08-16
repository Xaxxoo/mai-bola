'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { Button } from '@/components/ui/button';
import { DataTable, type TableColumn } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

type RouteRow = { id: string; name: string; zone: string; scheduledDate: string; status: string; driver?: { fullName: string } };
const columns: TableColumn<RouteRow>[] = [
  { key: 'name', label: 'Route', sortable: true, render: (row) => <Link className="font-semibold text-forest hover:underline" href={`/routes/${row.id}`}>{row.name}</Link> },
  { key: 'zone', label: 'Zone' }, { key: 'scheduledDate', label: 'Date', sortable: true },
  { key: 'driver', label: 'Driver', render: (row) => row.driver?.fullName || 'Unassigned' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];
export default function RoutesPage() {
  const [data, setData] = useState<RouteRow[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [zone, setZone] = useState(''); const [date, setDate] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { setLoading(true); const query = new URLSearchParams({ page: String(page), limit: '20' }); if (status) query.set('status', status); if (zone) query.set('zone', zone); if (date) query.set('date', date); api<{ data: RouteRow[]; total: number }>(`/admin/routes?${query}`).then((result) => { setData(result.data); setTotal(result.total); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load routes')).finally(() => setLoading(false)); }, [date, page, status, zone]);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-6"><div className="flex items-end justify-between"><div><p className="text-sm text-muted">Operations</p><h1 className="text-3xl font-heading font-bold text-text">Routes</h1></div><Link href="/routes/build"><Button>+ Build route</Button></Link></div><DataTable columns={columns} rows={data} rowKey={(row) => row.id} page={page} limit={20} total={total} onPageChange={setPage} loading={loading} filters={<><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All statuses</option>{['DRAFT', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED'].map((item) => <option key={item}>{item}</option>)}</select><select value={zone} onChange={(e) => { setZone(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All zones</option>{KADUNA_ZONES.map((item) => <option key={item}>{item}</option>)}</select><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /></>} />{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}
