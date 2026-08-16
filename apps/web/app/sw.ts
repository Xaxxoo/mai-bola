import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener('push', (event: any) => {
  const payload = event.data?.json?.() || { title: 'Mai Bola', body: 'You have a new update.' };
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, data: payload.data, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' }));
});
self.addEventListener('notificationclick', (event: any) => { event.notification.close(); event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/')); });
