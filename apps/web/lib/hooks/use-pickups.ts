'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Address = {
  id: string;
  label: string;
  streetText: string;
  area: string;
  zone: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

type PickupRequest = {
  id: string;
  userId: string;
  addressId: string;
  address?: Address;
  estimatedKg: number;
  note: string | null;
  photoUrls: string[];
  status: string;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export function usePickups(params?: { status?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  return useQuery<PaginatedResponse<PickupRequest>>({
    queryKey: ['pickups', params],
    queryFn: () => api(`/pickup-requests/mine${qs ? `?${qs}` : ''}`),
  });
}

export function usePickup(id: string) {
  return useQuery<PickupRequest>({
    queryKey: ['pickup', id],
    queryFn: () => api(`/pickup-requests/${id}`),
    enabled: !!id,
  });
}

type CreatePickupPayload = {
  addressId: string;
  estimatedKg: number;
  note?: string;
  photoUrls?: string[];
};

export function useCreatePickup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePickupPayload) =>
      api<PickupRequest>('/pickup-requests', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export function useCancelPickup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api<PickupRequest>(`/pickup-requests/${id}/cancel`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export type { PickupRequest, Address };
