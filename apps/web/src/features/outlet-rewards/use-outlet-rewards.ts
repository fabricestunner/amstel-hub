'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Paginated } from '@/features/users/use-users';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface OutletReward {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  status?: string;
  pointsCost: number;
  totalInventory?: number | null;
  remainingInventory?: number | null;
}

export interface OutletRewardRedemption {
  id: string;
  pointsSpent?: number;
  status?: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED' | string;
  createdAt?: string;
  outletReward?: { name?: string } | null;
  outlet?: { id: string; name: string } | null;
}

export function useOutletRewards() {
  return useQuery({
    queryKey: queryKeys.outletRewards,
    queryFn: () => api.get<OutletReward[] | Paginated<OutletReward>>('/outlet-rewards'),
    select: (data) => (Array.isArray(data) ? data : (data.items ?? [])),
  });
}

export interface OutletRewardInput {
  name: string;
  description?: string;
  pointsCost: number;
  totalInventory?: number | null;
}

export function useCreateOutletReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OutletRewardInput) =>
      api.post<OutletReward>('/outlet-rewards', input),
    onSuccess: () => {
      toast.success('Outlet reward created');
      qc.invalidateQueries({ queryKey: queryKeys.outletRewards });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create reward'),
  });
}

export function useUpdateOutletReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OutletRewardInput> }) =>
      api.put<OutletReward>(`/outlet-rewards/${id}`, input),
    onSuccess: () => {
      toast.success('Outlet reward updated');
      qc.invalidateQueries({ queryKey: queryKeys.outletRewards });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update reward'),
  });
}

export function useDeleteOutletReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/outlet-rewards/${id}`),
    onSuccess: () => {
      toast.success('Outlet reward deleted');
      qc.invalidateQueries({ queryKey: queryKeys.outletRewards });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete reward'),
  });
}

export function useRedeemOutletReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api.post<{ redemptionId: string; pointsSpent: number; availablePoints: number }>(
        `/outlet-rewards/${rewardId}/redeem`,
      ),
    onSuccess: () => {
      toast.success('Reward redeemed! Check status in your redemption history.');
      qc.invalidateQueries({ queryKey: ['outlet-dashboard'] });
      qc.invalidateQueries({ queryKey: queryKeys.outletRewardRedemptions() });
      qc.invalidateQueries({ queryKey: queryKeys.outletRewards });
    },
    onError: (err: Error) => toast.error(err.message || 'Redemption failed'),
  });
}

export function useOutletRewardRedemptions(status?: string) {
  return useQuery({
    queryKey: queryKeys.outletRewardRedemptions(status),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status && status !== 'all') qs.set('status', status);
      const q = qs.toString();
      return api.get<OutletRewardRedemption[] | Paginated<OutletRewardRedemption>>(
        `/outlet-reward-redemptions${q ? `?${q}` : ''}`,
      );
    },
    select: (data) => (Array.isArray(data) ? data : (data.items ?? [])),
  });
}

function useOutletRewardRedemptionAction(
  action: 'approve' | 'reject' | 'fulfill',
  successMsg: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<OutletRewardRedemption>(`/outlet-reward-redemptions/${id}/${action}`, {}),
    onSuccess: () => {
      toast.success(successMsg);
      qc.invalidateQueries({ queryKey: ['outlet-reward-redemptions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  });
}

export const useApproveOutletRewardRedemption = () =>
  useOutletRewardRedemptionAction('approve', 'Redemption approved');
export const useRejectOutletRewardRedemption = () =>
  useOutletRewardRedemptionAction('reject', 'Redemption rejected');
export const useFulfillOutletRewardRedemption = () =>
  useOutletRewardRedemptionAction('fulfill', 'Redemption fulfilled');
