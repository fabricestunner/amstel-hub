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

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'ended' | string;
  pointsPerCode?: number;
  startDate?: string;
  endDate?: string;
  codesGenerated?: number;
  codesRedeemed?: number;
}

export function useCampaigns(page = 1) {
  return useQuery({
    queryKey: queryKeys.campaigns(page),
    queryFn: () =>
      api.get<Paginated<Campaign>>(`/campaigns?page=${page}&limit=10`),
    placeholderData: keepPreviousData,
  });
}

export interface CampaignInput {
  name: string;
  description?: string;
  pointsPerCode?: number;
  startDate?: string;
  endDate?: string;
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) =>
      api.post<Campaign>('/campaigns', input),
    onSuccess: () => {
      toast.success('Campaign created');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create'),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Campaign>(`/campaigns/${id}/status`, { status: status.toUpperCase() }),
    onSuccess: () => {
      toast.success('Campaign updated');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update'),
  });
}

export interface GeneratedCode {
  code: string;
  type?: string;
}

export function useGenerateCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; count: number; type: string }) =>
      api.post<GeneratedCode[] | { codes: GeneratedCode[] }>(
        `/campaigns/${vars.id}/codes/generate`,
        { count: vars.count, type: vars.type },
      ),
    onSuccess: () => {
      toast.success('Codes generated');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not generate'),
  });
}
