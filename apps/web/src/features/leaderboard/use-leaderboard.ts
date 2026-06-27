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
  return useQuery({
    queryKey: queryKeys.leaderboardCustomers(period),
    queryFn: () =>
      api.get<LeaderboardEntry[] | Paginated<LeaderboardEntry>>(
        `/leaderboards/customers?period=${period}`,
      ),
    select: selectEntries,
  });
}

export function useOutletLeaderboard(period: 'monthly' | 'lifetime' = 'monthly') {
  return useQuery({
    queryKey: queryKeys.leaderboardOutlets(period),
    queryFn: () =>
      api.get<LeaderboardEntry[] | Paginated<LeaderboardEntry>>(
        `/leaderboards/outlets?period=${period}`,
      ),
    select: selectEntries,
  });
}
