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
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  pointsCost: number;
  imageUrl?: string;
  campaignId?: string;
  status?: string;
  // API inventory model: totalInventory = configured cap (null = unlimited),
  // remainingInventory = what's left after redemptions.
  totalInventory?: number | null;
  remainingInventory?: number | null;
}

export interface RewardRedemption {
  id: string;
  rewardId?: string;
  pointsSpent?: number;
  status?: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED' | string;
  createdAt?: string;
  reward?: { name?: string; type?: string } | null;
  user?: { id: string; firstName?: string; lastName?: string } | null;
  collectionOutlet?: { id: string; name: string } | null;
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
    mutationFn: ({ rewardId, collectionOutletId }: { rewardId: string; collectionOutletId: string }) =>
      api.post<RewardRedemption>(`/rewards/${rewardId}/redeem`, { collectionOutletId }),
    onSuccess: () => {
      toast.success('Reward redeemed! Check History for status.');
      qc.invalidateQueries({ queryKey: queryKeys.wallet });
      qc.invalidateQueries({ queryKey: ['reward-redemptions'] });
      qc.invalidateQueries({ queryKey: ['my-reward-redemptions'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Redemption failed'),
  });
}

export interface MyRewardRedemption {
  id: string;
  status?: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED' | string;
  pointsSpent?: number;
  fulfillmentRef?: string | null;
  createdAt?: string;
  reward?: { id: string; name: string; type?: string };
}

/** The current customer's own claimed rewards, paginated. */
export function useMyRewardRedemptions(page = 1) {
  return useQuery({
    queryKey: ['my-reward-redemptions', page] as const,
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page) });
      return api.get<Paginated<MyRewardRedemption>>(
        `/rewards/redemptions?${qs.toString()}`,
      );
    },
    placeholderData: keepPreviousData,
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

/**
 * Redemption queue for the outlet portal. The API force-scopes
 * OUTLET_MANAGER callers to redemptions collected at their outlet, so no
 * outlet id is passed here. Paginated (meta preserved for the table pager).
 */
export function useOutletRedemptions(page = 1, status?: string) {
  return useQuery({
    queryKey: queryKeys.outletRedemptions(page, status),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page) });
      if (status && status !== 'all') qs.set('status', status);
      return api.get<Paginated<RewardRedemption>>(
        `/reward-redemptions?${qs.toString()}`,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export interface RewardInput {
  campaignId?: string;
  name: string;
  description?: string;
  categoryId?: string;
  pointsCost: number;
  totalInventory?: number | null;
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
      api.put<Reward>(`/rewards/${id}`, input),
    onSuccess: () => {
      toast.success('Reward updated');
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update reward'),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/rewards/${id}`),
    onSuccess: () => {
      toast.success('Reward deleted');
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete reward'),
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
