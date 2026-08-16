'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { enablePushNotifications } from '@/lib/push-notifications';
import { formatDateTime } from '@/lib/format-date';

type NotificationItem = { id: string; title: string; body: string; readAt: string | null; createdAt: string };
type NotificationResponse = { data: NotificationItem[]; unreadCount: number };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api<NotificationResponse>('/notifications'), refetchInterval: 30_000 });
  const markRead = useMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  async function turnOnPush() { try { await enablePushNotifications(); setPushMessage('Push notifications enabled.'); } catch (error) { setPushMessage(error instanceof Error ? error.message : 'Push notifications could not be enabled.'); } }
  return <div className="relative">
    <button type="button" aria-label="Notifications" onClick={() => setOpen((value) => !value)} className="relative rounded-full p-2 text-forest hover:bg-mint/30"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{!!query.data?.unreadCount && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-bold text-white">{query.data.unreadCount > 9 ? '9+' : query.data.unreadCount}</span>}</button>
    {open && <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-100 bg-white p-4 shadow-card"><div className="mb-3 flex items-center justify-between"><h2 className="font-heading text-lg font-semibold text-forest">Notifications</h2><button type="button" onClick={turnOnPush} className="text-xs font-semibold text-forest underline">Enable push</button></div>{pushMessage && <p className="mb-2 rounded-lg bg-mint/40 p-2 text-xs text-forest">{pushMessage}</p>}{query.isLoading && <p className="py-5 text-sm text-muted">Loading notifications…</p>}{query.isError && <p className="py-5 text-sm text-coral">Couldn’t load notifications. Try again.</p>}{!query.isLoading && !query.isError && !query.data?.data.length && <p className="py-5 text-sm text-muted">You’re all caught up.</p>}<div className="max-h-72 space-y-1 overflow-auto">{query.data?.data.map((item) => <button type="button" key={item.id} onClick={() => !item.readAt && markRead.mutate(item.id)} className={`block w-full rounded-xl p-3 text-left hover:bg-bg ${item.readAt ? '' : 'bg-mint/20'}`}><p className="text-sm font-semibold text-forest">{item.title}</p><p className="text-xs text-text">{item.body}</p><p className="mt-1 text-[11px] text-muted">{formatDateTime(item.createdAt)}</p></button>)}</div></div>}
  </div>;
}
