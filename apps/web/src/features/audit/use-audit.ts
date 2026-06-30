'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Paginated } from '@/features/users/use-users';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface AuditActor {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  actor?: AuditActor | null;
}

export function useAuditLogs(params: { page?: number; search?: string; enabled?: boolean } = {}) {
  const { page = 1, search = '', enabled = true } = params;
  return useQuery({
    queryKey: queryKeys.auditLogs(page, search),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('search', search);
      return api.get<Paginated<AuditLogRow>>(`/audit-logs?${qs.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export interface FraudUser {
  id: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface FraudFlagRow {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'REVIEWING' | 'CONFIRMED' | 'DISMISSED' | string;
  ipAddress?: string;
  createdAt: string;
  user?: FraudUser | null;
}

export function useFraudFlags(params: { page?: number; status?: string } = {}) {
  const { page = 1, status = '' } = params;
  return useQuery({
    queryKey: queryKeys.fraudFlags(page, status),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'all') qs.set('status', status);
      return api.get<Paginated<FraudFlagRow>>(`/fraud/flags?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/fraud/flags/${id}/resolve`, { status }),
    onSuccess: () => {
      toast.success('Flag updated');
      qc.invalidateQueries({ queryKey: ['fraud-flags'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update flag'),
  });
}
