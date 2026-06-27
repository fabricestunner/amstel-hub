'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface Reward {
  id: string;
  name: string;
  description?: string;
  type?: string;
  pointsCost: number;
  imageUrl?: string;
  stock?: number | null;
  active?: boolean;
}

export interface RewardRedemption {
  id: string;
  rewardId?: string;
  rewardName?: string;
  customerName?: string;
  customerId?: string;
  pointsCost?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'fulfilled' | string;
  createdAt?: string;
}

export function useRewards(type?: string) {
  return useQuery({
    queryKey: queryKeys.rewards(type),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (type && type !== 'all') qs.set('type', type);
      const q = qs.toString();
      return api.get<Reward[] | Paginated<Reward>>(`/rewards${q ? `?${q}` : ''}`);
    },
    select: (data) => (Array.isArray(data) ? data : data.items ?? []),
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api.post<RewardRedemption>(`/rewards/${rewardId}/redeem`, {}),
    onSuccess: () => {
      toast.success('Reward redeemed! Check History for status.');
      qc.invalidateQueries({ queryKey: queryKeys.wallet });
      qc.invalidateQueries({ queryKey: ['reward-redemptions'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Redemption failed'),
  });
}

export function useRewardRedemptions(status?: string) {
  return useQuery({
    queryKey: queryKeys.rewardRedemptions(status),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status && status !== 'all') qs.set('status', status);
      const q = qs.toString();
      return api.get<RewardRedemption[] | Paginated<RewardRedemption>>(
        `/reward-redemptions${q ? `?${q}` : ''}`,
      );
    },
    select: (data) => (Array.isArray(data) ? data : data.items ?? []),
    placeholderData: keepPreviousData,
  });
}

export interface RewardInput {
  name: string;
  description?: string;
  type?: string;
  pointsCost: number;
  stock?: number | null;
  active?: boolean;
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RewardInput) => api.post<Reward>('/rewards', input),
    onSuccess: () => {
      toast.success('Reward created');
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create reward'),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RewardInput> }) =>
      api.patch<Reward>(`/rewards/${id}`, input),
    onSuccess: () => {
      toast.success('Reward updated');
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update reward'),
  });
}

function useRedemptionAction(
  action: 'approve' | 'reject' | 'fulfill',
  successMsg: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<RewardRedemption>(`/reward-redemptions/${id}/${action}`, {}),
    onSuccess: () => {
      toast.success(successMsg);
      qc.invalidateQueries({ queryKey: ['reward-redemptions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  });
}

export const useApproveRedemption = () =>
  useRedemptionAction('approve', 'Redemption approved');
export const useRejectRedemption = () =>
  useRedemptionAction('reject', 'Redemption rejected');
export const useFulfillRedemption = () =>
  useRedemptionAction('fulfill', 'Redemption fulfilled');
