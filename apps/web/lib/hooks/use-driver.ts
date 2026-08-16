'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  applyDriverAction,
  driverQueueChangeEvent,
  getDriverActions,
  getDriverManifest,
  getDriverManifests,
  pendingDriverActionCount,
  removeDriverAction,
  saveDriverAction,
  saveDriverManifest,
  type DriverAction,
  type DriverManifest,
} from '@/lib/driver-offline';

const routeKey = (id: string) => ['driver-route', id] as const;

function isOfflineError(error: unknown) {
  return typeof navigator !== 'undefined' &&
    (!navigator.onLine || error instanceof TypeError);
}

async function fetchToday() {
  try {
    const routes = await api<DriverManifest[]>('/driver/routes/today');
    await Promise.all(routes.map(saveDriverManifest));
    return routes;
  } catch (error) {
    const cached = await getDriverManifests();
    if (cached.length) return cached;
    throw error;
  }
}

export function useDriverToday() {
  return useQuery({ queryKey: ['driver-today'], queryFn: fetchToday });
}

export function useDriverRoute(routeId: string) {
  return useQuery<DriverManifest>({
    queryKey: routeKey(routeId),
    queryFn: async () => {
      try {
        const routes = await api<DriverManifest[]>('/driver/routes/today');
        const route = routes.find((item) => item.id === routeId);
        if (!route) throw new Error('Route not found');
        await saveDriverManifest(route);
        return route;
      } catch (error) {
        const cached = await getDriverManifest(routeId);
        if (cached) return cached;
        throw error;
      }
    },
  });
}

export function useStartDriverRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) =>
      api<DriverManifest>(`/driver/routes/${routeId}/start`, { method: 'POST' }),
    onSuccess: (route) => {
      queryClient.setQueryData(routeKey(route.id), route);
      queryClient.setQueryData(['driver-today'], [route]);
      void saveDriverManifest(route);
    },
  });
}

export type DriverActionInput = {
  routeId: string;
  stopId: string;
  kind: DriverAction['kind'];
  payload?: Record<string, unknown>;
};

export function useDriverAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DriverActionInput) => {
      const action: DriverAction = {
        ...input,
        payload: input.payload || {},
        idempotencyKey: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      if (!navigator.onLine) {
        await saveDriverAction(action);
        return { queued: true, action };
      }

      try {
        const path = input.kind === 'arrive'
          ? `/driver/stops/${input.stopId}/arrive`
          : input.kind === 'collect'
            ? `/driver/stops/${input.stopId}/collect`
            : `/driver/stops/${input.stopId}/skip`;
        const result = await api(path, {
          method: 'POST',
          body: input.payload,
          headers: { 'Idempotency-Key': action.idempotencyKey },
        });
        return { queued: false, action, result };
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        await saveDriverAction(action);
        return { queued: true, action };
      }
    },
    onSuccess: ({ action }) => {
      queryClient.setQueryData<DriverManifest>(routeKey(action.routeId), (old) => {
        if (!old) return old;
        const next = applyDriverAction(old, action);
        void saveDriverManifest(next);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    },
  });
}

export function useCompleteDriverRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) =>
      api<DriverManifest>(`/driver/routes/${routeId}/complete`, { method: 'POST' }),
    onSuccess: (route) => {
      queryClient.setQueryData(routeKey(route.id), route);
      void saveDriverManifest(route);
    },
  });
}

export function useDriverSync() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const updateCount = () => void pendingDriverActionCount().then(setPending);
    const sync = async () => {
      if (!navigator.onLine) return;
      for (const action of await getDriverActions()) {
        try {
          const path = action.kind === 'arrive'
            ? `/driver/stops/${action.stopId}/arrive`
            : action.kind === 'collect'
              ? `/driver/stops/${action.stopId}/collect`
              : `/driver/stops/${action.stopId}/skip`;
          await api(path, {
            method: 'POST',
            body: action.payload,
            headers: { 'Idempotency-Key': action.idempotencyKey },
          });
          if (action.id !== undefined) await removeDriverAction(action.id);
        } catch {
          break; // preserve action order until the network is healthy
        }
      }
      updateCount();
      queryClient.invalidateQueries({ queryKey: ['driver-today'] });
      queryClient.invalidateQueries({ queryKey: ['driver-route'] });
    };
    updateCount();
    window.addEventListener('online', sync);
    window.addEventListener(driverQueueChangeEvent(), updateCount);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener(driverQueueChangeEvent(), updateCount);
    };
  }, [queryClient]);

  return pending;
}

export { routeKey };
