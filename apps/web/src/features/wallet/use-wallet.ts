'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

export interface Wallet {
  availablePoints: number;
  redeemedPoints: number;
  lifetimePoints: number;
}

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get<Wallet>('/loyalty/wallet'),
  });
}

export function useRedeemCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ pointsEarned: number }>('/loyalty/redeem', { code }),
    onSuccess: (res) => {
      toast.success(`You earned ${res.pointsEarned} points! 🎉`);
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
