'use client';

import { useMemo } from 'react';
import { Button } from './button';

export type TableColumn<T> = { key: string; label: string; render?: (row: T) => React.ReactNode; sortable?: boolean };
type Props<T> = { columns: TableColumn<T>[]; rows: T[]; rowKey: (row: T) => string; page: number; limit: number; total: number; sort?: string; direction?: 'asc' | 'desc'; onPageChange: (page: number) => void; onSort?: (key: string) => void; filters?: React.ReactNode; onExport?: () => void; loading?: boolean };

export function exportCsv<T extends Record<string, unknown>>(rows: T[], columns: TableColumn<T>[], filename: string) {
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [columns.map((column) => escape(column.label)).join(','), ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, rowKey, page, limit, total, sort, direction = 'asc', onPageChange, onSort, filters, onExport, loading }: Props<T>) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const range = useMemo(() => total === 0 ? 'No results' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`, [limit, page, total]);
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-4 border-b border-gray-100 p-4"><div className="flex flex-wrap items-center gap-3">{filters}</div><Button variant="secondary" onClick={onExport}>↓ Export CSV</Button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-5 py-3 font-semibold">{column.sortable ? <button onClick={() => onSort?.(column.key)} className="inline-flex items-center gap-1">{column.label}<span className="text-[10px]">{sort === column.key ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span></button> : column.label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}>{columns.map((column) => <td key={column.key} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>)}</tr>) : rows.map((row) => <tr key={rowKey(row)} className="hover:bg-tint/50">{columns.map((column) => <td key={column.key} className="px-5 py-4 text-text">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-muted"><span>{range}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</Button></div></div></div>;
}
