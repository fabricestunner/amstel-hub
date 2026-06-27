'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface PointsTransaction {
  id: string;
  type?: 'earn' | 'redeem' | 'adjust' | string;
  description?: string;
  source?: string;
  points: number;
  balance?: number;
  createdAt?: string;
}

export function useTransactions(page = 1) {
  return useQuery({
    queryKey: queryKeys.transactions(page),
    queryFn: () =>
      api.get<Paginated<PointsTransaction>>(
        `/loyalty/transactions?page=${page}&limit=10`,
      ),
    placeholderData: keepPreviousData,
  });
}
