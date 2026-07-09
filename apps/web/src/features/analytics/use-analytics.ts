'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getAccessToken } from '@/lib/api-client';
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

const REPORTS_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Downloads a report as CSV. The backend streams raw CSV (bypassing the JSON
 * envelope), so we fetch directly with the bearer token and trigger a browser
 * download rather than going through the enveloped `api` helper.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async (vars: { type: string }) => {
      const token = getAccessToken();
      const res = await fetch(`${REPORTS_API_URL}/reports/${vars.type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        let message = 'Report generation failed';
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          /* non-JSON error body — keep the default message */
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `${vars.type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onMutate: () => {
      toast.loading('Generating CSV…', { id: 'report' });
    },
    onSuccess: () => {
      toast.success('CSV downloaded', { id: 'report' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Export failed', { id: 'report' });
    },
  });
}
