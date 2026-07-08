'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface AnalyticsOverview {
  activeUsers?: number;
  activeUsersDelta?: number;
  pointsIssued?: number;
  pointsIssuedDelta?: number;
  pointsRedeemed?: number;
  pointsRedeemedDelta?: number;
  rewardRedemptions?: number;
  rewardRedemptionsDelta?: number;
  topOutlets?: { id: string; name: string; region?: string; points: number; sales?: number }[];
  topCustomers?: { id: string; name: string; points: number; region?: string }[];
  topRegions?: { name: string; value: number }[];
}

export interface TrendPoint {
  name: string;
  value: number;
}

export interface AnalyticsTrends {
  registrations?: TrendPoint[];
  pointsIssued?: TrendPoint[];
  pointsRedeemed?: TrendPoint[];
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.analyticsOverview,
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview'),
  });
}

export function useAnalyticsTrends(days = 30) {
  return useQuery({
    queryKey: queryKeys.analyticsTrends(String(days)),
    queryFn: () => api.get<AnalyticsTrends>(`/analytics/trends?days=${days}`),
  });
}

export interface AnalyticsDemographics {
  gender: TrendPoint[];
  age: TrendPoint[];
  hours: TrendPoint[];
}

export function useAnalyticsDemographics() {
  return useQuery({
    queryKey: ['analytics', 'demographics'],
    queryFn: () =>
      api.get<AnalyticsDemographics>('/analytics/demographics'),
  });
}

/** Placeholder report export — backend report endpoints are future work. */
export function useExportReport() {
  return useMutation({
    mutationFn: (vars: { type: string; format: 'csv' | 'excel' | 'pdf' }) =>
      api.post(`/reports/${vars.type}`, { format: vars.format }),
    onMutate: (vars) => {
      toast.loading(`Generating ${vars.format.toUpperCase()} report…`, {
        id: 'report',
      });
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.format.toUpperCase()} report ready`, { id: 'report' });
    },
    onError: () => {
      toast.error('Report generation is not available yet', { id: 'report' });
    },
  });
}
