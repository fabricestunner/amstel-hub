'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  region?: string;
  points: number;
  avatarUrl?: string;
  change?: number;
}

function selectEntries(
  data: LeaderboardEntry[] | Paginated<LeaderboardEntry>,
): LeaderboardEntry[] {
  return Array.isArray(data) ? data : data.items ?? [];
}

export function useCustomerLeaderboard(period: 'monthly' | 'lifetime' = 'monthly') {
  const type = period === 'lifetime' ? 'CUSTOMER_LIFETIME' : 'CUSTOMER_MONTHLY';
  return useQuery({
    queryKey: queryKeys.leaderboardCustomers(period),
    queryFn: () =>
      api.get<LeaderboardEntry[] | Paginated<LeaderboardEntry>>(
        `/leaderboards/customers?type=${type}`,
      ),
    select: selectEntries,
  });
}

export function useOutletLeaderboard(period: 'monthly' | 'lifetime' = 'monthly') {
  const type = period === 'lifetime' ? 'OUTLET_NATIONAL' : 'OUTLET_NATIONAL';
  return useQuery({
    queryKey: queryKeys.leaderboardOutlets(period),
    queryFn: () =>
      api.get<LeaderboardEntry[] | Paginated<LeaderboardEntry>>(
        `/leaderboards/outlets?type=${type}`,
      ),
    select: selectEntries,
  });
}
