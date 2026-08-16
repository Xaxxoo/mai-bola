'use client';

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
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

// --- Transactions (infinite scroll) ---

type WalletTransaction = {
  id: string;
  userId: string;
  type: 'CREDIT_COLLECTION' | 'DEBIT_PAYOUT' | 'ADJUSTMENT';
  amount: number;
  balanceAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

type TransactionsPage = {
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
};

export function useTransactions(limit = 20) {
  return useInfiniteQuery<TransactionsPage>({
    queryKey: ['wallet-transactions'],
    queryFn: ({ pageParam }) =>
      api(`/wallet/transactions?page=${pageParam}&limit=${limit}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.limit;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

// --- Payouts ---

type Payout = {
  id: string;
  userId: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CASH';
  destinationDetails: Record<string, unknown>;
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
  rejectedReason: string | null;
  paidReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useMyPayouts() {
  return useQuery<Payout[]>({
    queryKey: ['my-payouts'],
    queryFn: () => api('/payouts/mine'),
  });
}

type RequestPayoutPayload = {
  amount: number;
  method: 'BANK_TRANSFER' | 'MOBILE_MONEY';
  destination: Record<string, unknown>;
};

export function useRequestPayout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RequestPayoutPayload) =>
      api<Payout>('/payouts', { method: 'POST', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      qc.invalidateQueries({ queryKey: ['my-payouts'] });
    },
  });
}

export function useCancelPayout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payoutId: string) =>
      api<Payout>(`/payouts/${payoutId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      qc.invalidateQueries({ queryKey: ['my-payouts'] });
    },
  });
}

export type { Wallet, WalletTransaction, Payout };
