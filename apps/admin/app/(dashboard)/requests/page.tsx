'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { api } from '@/lib/api';
import { DataTable, exportCsv, type TableColumn } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';

const RequestsMap = dynamic(() => import('@/components/requests-map').then((module) => module.RequestsMap), { ssr: false });
type RequestRow = { id: string; userId: string; estimatedKg: number; status: string; createdAt: string; user?: { fullName: string; phone: string }; address: { streetText: string; area: string; zone: string; lat: number | string; lng: number | string } };
const columns: TableColumn<RequestRow>[] = [
  { key: 'id', label: 'Request', sortable: true, render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
  { key: 'supplier', label: 'Supplier', render: (row) => <div><p className="font-medium">{row.user?.fullName || '—'}</p><p className="text-xs text-muted">{row.user?.phone}</p></div> },
  { key: 'address', label: 'Location', render: (row) => <span>{row.address?.area || row.address?.zone || '—'}</span> },
  { key: 'estimatedKg', label: 'Est. kg', sortable: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'createdAt', label: 'Created', sortable: true, render: (row) => new Date(row.createdAt).toLocaleDateString('en-NG') },
];

export default function RequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [status, setStatus] = useState(''); const [zone, setZone] = useState(''); const [search, setSearch] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [sort, setSort] = useState(''); const [direction, setDirection] = useState<'asc' | 'desc'>('asc'); const [view, setView] = useState<'table' | 'map'>('table'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { setLoading(true); const query = new URLSearchParams({ page: String(page), limit: '20' }); if (status) query.set('status', status); if (zone) query.set('zone', zone); if (search) query.set('search', search); if (from) query.set('from', from); if (to) query.set('to', to); if (sort) { query.set('sort', sort); query.set('direction', direction); } api<{ data: RequestRow[]; total: number }>(`/admin/pickup-requests?${query}`).then((response) => { setRows(response.data); setTotal(response.total); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load requests')).finally(() => setLoading(false)); }, [direction, from, page, search, sort, status, to, zone]);
  useEffect(() => { load(); }, [load]);
  const allRows = useMemo(() => rows.map((row) => ({ ...row, supplier: row.user?.fullName || '', location: row.address?.area || '' })), [rows]);
  function sortBy(key: string) { if (sort === key) setDirection(direction === 'asc' ? 'desc' : 'asc'); else { setSort(key); setDirection('asc'); } setPage(1); }
  function resetFilters() { setStatus(''); setZone(''); setSearch(''); setFrom(''); setTo(''); setPage(1); }
  return <div className="space-y-6"><div className="flex items-end justify-between"><div><p className="text-sm text-muted">Operations</p><h1 className="text-3xl font-heading font-bold text-text">Pickup requests</h1></div><div className="flex gap-2"><Button variant={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>Table</Button><Button variant={view === 'map' ? 'primary' : 'secondary'} onClick={() => setView('map')}>Map view</Button></div></div>{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}{view === 'map' ? <RequestsMap requests={rows.map((row) => ({ id: row.id, estimatedKg: Number(row.estimatedKg), status: row.status, supplier: { fullName: row.user?.fullName || 'Supplier', phone: row.user?.phone || '' }, address: row.address }))} /> : <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} page={page} limit={20} total={total} sort={sort} direction={direction} onPageChange={setPage} onSort={sortBy} loading={loading} filters={<><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All statuses</option>{['PENDING', 'CLUSTERED', 'SCHEDULED', 'EN_ROUTE', 'COLLECTED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}</select><select value={zone} onChange={(e) => { setZone(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All zones</option>{KADUNA_ZONES.map((item) => <option key={item}>{item}</option>)}</select><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or phone…" className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm" /><DateRangePicker from={from} to={to} onChange={(range) => { setFrom(range.from); setTo(range.to); setPage(1); }} /><Button variant="ghost" onClick={resetFilters}>Reset</Button></>} onExport={() => exportCsv(allRows as unknown as Record<string, unknown>[], columns as unknown as TableColumn<Record<string, unknown>>[], 'pickup-requests.csv')} />}</div>;
}
