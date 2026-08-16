'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Wallet = {
  balance: string;
  totalEarned: string;
  totalPaidOut: string;
};

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: () => api('/wallet'),
  });
}
