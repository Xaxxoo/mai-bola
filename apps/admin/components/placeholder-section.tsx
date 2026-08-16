'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DataTable, exportCsv, type TableColumn } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

type Row = Record<string, unknown>;
const configs: Record<string, { endpoint: string; columns: TableColumn<Row>[] }> = {
  requests: { endpoint: '/admin/pickup-requests', columns: [{ key: 'id', label: 'Request ID' }, { key: 'userId', label: 'Supplier' }, { key: 'estimatedKg', label: 'Est. kg' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> }, { key: 'createdAt', label: 'Created' }] },
  routes: { endpoint: '/admin/routes', columns: [{ key: 'name', label: 'Route' }, { key: 'zone', label: 'Zone' }, { key: 'scheduledDate', label: 'Date' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> }] },
  suppliers: { endpoint: '/admin/users?role=SUPPLIER', columns: [{ key: 'fullName', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'supplierType', label: 'Type' }, { key: 'isActive', label: 'Active', render: (row) => row.isActive ? 'Yes' : 'No' }] },
  payouts: { endpoint: '/admin/payouts', columns: [{ key: 'id', label: 'Payout ID' }, { key: 'amount', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> }, { key: 'createdAt', label: 'Requested' }] },
  inventory: { endpoint: '/admin/batches', columns: [{ key: 'id', label: 'Batch ID' }, { key: 'grossKg', label: 'Gross kg' }, { key: 'processedKg', label: 'Processed kg' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> }, { key: 'createdAt', label: 'Created' }] },
  sales: { endpoint: '/admin/sales', columns: [{ key: 'buyerName', label: 'Buyer' }, { key: 'totalKg', label: 'Total kg' }, { key: 'revenue', label: 'Revenue' }, { key: 'contribution', label: 'Contribution' }, { key: 'soldAt', label: 'Sold' }] },
};

export function PlaceholderSection({ section, title, description }: { section: keyof typeof configs; title: string; description: string }) {
  const config = configs[section]; const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [sort, setSort] = useState(''); const [direction, setDirection] = useState<'asc' | 'desc'>('asc'); const [result, setResult] = useState<{ data: Row[]; total: number }>({ data: [], total: 0 }); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { setLoading(true); const separator = config.endpoint.includes('?') ? '&' : '?'; const query = `${config.endpoint}${separator}page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${sort ? `&sort=${sort}&direction=${direction}` : ''}`; api<{ data: Row[]; total: number }>(query).then(setResult).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load data')).finally(() => setLoading(false)); }, [config.endpoint, direction, page, search, sort]);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => result.data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value]))), [result.data]);
  function toggleSort(key: string) { if (sort === key) setDirection(direction === 'asc' ? 'desc' : 'asc'); else { setSort(key); setDirection('asc'); } setPage(1); }
  return <div className="space-y-6"><div><h1 className="text-3xl font-heading font-bold text-text">{title}</h1><p className="mt-1 text-sm text-muted">{description}</p></div>{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}<Button variant="ghost" className="ml-3" onClick={() => { setError(''); load(); }}>Retry</Button></div>}<DataTable columns={config.columns} rows={rows} rowKey={(row) => String(row.id)} page={page} limit={20} total={result.total} sort={sort} direction={direction} onPageChange={setPage} onSort={toggleSort} loading={loading} filters={<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search…" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />} onExport={() => exportCsv(rows, config.columns, `${section}.csv`)} /></div>;
}
