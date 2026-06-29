'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface Outlet {
  id: string;
  name: string;
  region?: string;
  city?: string;
  status?: 'active' | 'inactive' | string;
  pointsGenerated?: number;
  customers?: number;
  nationalRank?: number;
  regionalRank?: number;
}

export interface OutletDashboard {
  outletId: string;
  name?: string;
  nationalRank?: number;
  regionalRank?: number;
  campaignSales?: number;
  pointsGenerated?: number;
  customersRegistered?: number;
  rewardsEarned?: number;
  tournamentEntries?: number;
  pointsTrend?: { name: string; value: number }[];
  recentCustomers?: {
    id: string;
    name: string;
    points?: number;
    joinedAt?: string;
  }[];
}

export function useOutlets(params: {
  page?: number;
  search?: string;
  region?: string;
  status?: string;
} = {}) {
  const { page = 1, search = '', region = '', status = '' } = params;
  return useQuery({
    queryKey: queryKeys.outlets({ page, search, region, status }),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('search', search);
      if (region && region !== 'all') qs.set('region', region);
      if (status && status !== 'all') qs.set('status', status.toUpperCase());
      return api.get<Outlet[] | Paginated<Outlet>>(`/outlets?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useOutletDashboard(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outletDashboard(id ?? ''),
    queryFn: () => api.get<OutletDashboard>(`/outlets/${id}/dashboard`),
    enabled: !!id,
  });
}
