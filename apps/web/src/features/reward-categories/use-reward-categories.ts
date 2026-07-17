'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

export interface RewardCategory {
  id: string;
  name: string;
  slug: string;
  behavior: 'STANDARD' | 'TOURNAMENT_ENTRY';
  isSystem: boolean;
  sortOrder: number;
}

const KEY = ['reward-categories'] as const;

export function useRewardCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<RewardCategory[]>('/reward-categories'),
  });
}

export interface RewardCategoryInput {
  name: string;
  sortOrder?: number;
}

export function useCreateRewardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RewardCategoryInput) =>
      api.post<RewardCategory>('/reward-categories', input),
    onSuccess: () => {
      toast.success('Category created');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create category'),
  });
}

export function useUpdateRewardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RewardCategoryInput> }) =>
      api.patch<RewardCategory>(`/reward-categories/${id}`, input),
    onSuccess: () => {
      toast.success('Category updated');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update category'),
  });
}

export function useDeleteRewardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/reward-categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: KEY });
      // Rewards show the category name, so refresh them too.
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete category'),
  });
}
