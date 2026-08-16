'use client';

import { useQuery } from '@tanstack/react-query';

type PublicMetrics = {
  tonnesRecovered: number;
  tonnesSold: number;
  activeSuppliers: number;
  paidToSuppliers: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function usePublicMetrics() {
  return useQuery<PublicMetrics>({
    queryKey: ['public-metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/metrics/public`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // match API cache TTL
  });
}
