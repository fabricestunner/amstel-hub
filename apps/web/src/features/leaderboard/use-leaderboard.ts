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

/**
 * Outlets don't have a "monthly" ranking — only national and regional (see
 * OutletLeaderboardQuery.type on the API). Regional requires a regionId.
 */
export function useOutletLeaderboard(
  scope: 'national' | 'regional',
  regionId?: string,
) {
  const type = scope === 'regional' ? 'OUTLET_REGIONAL' : 'OUTLET_NATIONAL';
  return useQuery({
    queryKey: queryKeys.leaderboardOutlets(scope, regionId),
    queryFn: () => {
      const qs = new URLSearchParams({ type });
      if (scope === 'regional' && regionId) qs.set('regionId', regionId);
      return api.get<LeaderboardEntry[] | Paginated<LeaderboardEntry>>(
        `/leaderboards/outlets?${qs.toString()}`,
      );
    },
    enabled: scope === 'national' || Boolean(regionId),
    select: selectEntries,
  });
}

/** Top customers registered at a specific outlet — the outlet manager's own
 *  customer ranking, distinct from the platform-wide customer leaderboard. */
export function useOutletCustomerLeaderboard(
  outletId: string | undefined,
  period: 'monthly' | 'lifetime' = 'monthly',
) {
  return useQuery({
    queryKey: queryKeys.outletCustomerLeaderboard(outletId, period),
    queryFn: () =>
      api.get<LeaderboardEntry[]>(
        `/outlets/${outletId}/customers/leaderboard?period=${period}`,
      ),
    enabled: Boolean(outletId),
  });
}
