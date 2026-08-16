import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type DriverAction = {
  id?: number;
  routeId: string;
  stopId: string;
  kind: 'arrive' | 'collect' | 'skip';
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: number;
};

type DriverDb = DBSchema & {
  actions: {
    key: number;
    value: DriverAction;
    indexes: { byCreatedAt: number };
  };
  manifests: {
    key: string;
    value: { routeId: string; manifest: DriverManifest; cachedAt: number };
  };
};

export type DriverManifest = {
  id: string;
  name: string;
  zone: string;
  scheduledDate: string;
  status: string;
  estimatedTotalKg: number;
  stops: DriverStop[];
};

export type DriverStop = {
  id: string;
  stopOrder: number;
  status: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SKIPPED';
  skippedReason?: string | null;
  estimatedKg: number;
  supplier: { fullName: string; phone: string };
  pickupRequest: {
    id: string;
    estimatedKg: number;
    status: string;
    address: {
      streetText: string;
      area: string;
      zone: string;
      lat: number | string;
      lng: number | string;
    };
  };
  collection?: {
    actualKg: number;
    amountPaid: number;
    pricePerKg: number;
  } | null;
};

const DB_NAME = 'mai-bola-driver';
const CHANGE_EVENT = 'mai-bola-driver-queue-change';

let dbPromise: Promise<IDBPDatabase<DriverDb>> | undefined;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<DriverDb>(DB_NAME, 1, {
      upgrade(database) {
        const actions = database.createObjectStore('actions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        actions.createIndex('byCreatedAt', 'createdAt');
        database.createObjectStore('manifests', { keyPath: 'routeId' });
      },
    });
  }
  return dbPromise;
}

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function driverQueueChangeEvent() {
  return CHANGE_EVENT;
}

export async function saveDriverManifest(manifest: DriverManifest) {
  if (typeof window === 'undefined') return;
  await (await db()).put('manifests', {
    routeId: manifest.id,
    manifest,
    cachedAt: Date.now(),
  });
}

export async function getDriverManifest(routeId: string) {
  if (typeof window === 'undefined') return undefined;
  return (await db()).get('manifests', routeId).then((entry) => entry?.manifest);
}

export async function getDriverManifests() {
  if (typeof window === 'undefined') return [];
  return (await db()).getAll('manifests').then((entries) =>
    entries.map((entry) => entry.manifest),
  );
}

export async function saveDriverAction(action: DriverAction) {
  await (await db()).add('actions', action);
  notifyQueueChanged();
}

export async function getDriverActions() {
  const actions = await (await db()).getAllFromIndex('actions', 'byCreatedAt');
  return actions.sort((a, b) => a.createdAt - b.createdAt || (a.id || 0) - (b.id || 0));
}

export async function pendingDriverActionCount() {
  return (await db()).count('actions');
}

export async function removeDriverAction(id: number) {
  await (await db()).delete('actions', id);
  notifyQueueChanged();
}

export function applyDriverAction(
  manifest: DriverManifest,
  action: Pick<DriverAction, 'stopId' | 'kind' | 'payload'>,
): DriverManifest {
  const stops = manifest.stops.map((stop) => {
    if (stop.id !== action.stopId) return stop;
    if (action.kind === 'arrive') return { ...stop, status: 'ARRIVED' as const };
    if (action.kind === 'skip') {
      return {
        ...stop,
        status: 'SKIPPED' as const,
        skippedReason: String(action.payload.reason || ''),
      };
    }
    const actualKg = Number(action.payload.actualKg);
    return {
      ...stop,
      status: 'COLLECTED' as const,
      collection: { actualKg, pricePerKg: 120, amountPaid: actualKg * 120 },
    };
  });
  return { ...manifest, stops };
}

export { CHANGE_EVENT };
