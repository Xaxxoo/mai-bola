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

type CreateAddressPayload = {
  label: string;
  streetText: string;
  zone: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
};

export function useAddresses() {
  return useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: () => api('/users/me/addresses'),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAddressPayload) =>
      api<Address>('/users/me/addresses', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export type { Address, CreateAddressPayload };
