'use client';
import { Button } from './button';
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel, loading }: { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-text">{title}</h2><p className="mt-2 text-sm text-muted">{description}</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div></div></div>;
}
