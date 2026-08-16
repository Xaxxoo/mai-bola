import { api } from './api';

function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export async function enablePushNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push notifications are not supported on this device');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications are disabled. You can enable them in your browser settings.');
  const { publicKey } = await api<{ publicKey: string | null }>('/notifications/vapid-public-key');
  if (!publicKey) throw new Error('Push notifications are not configured yet');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
  await api('/notifications/push-subscription', { method: 'POST', body: subscription.toJSON() });
}
