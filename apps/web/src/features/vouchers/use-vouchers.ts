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

export type VoucherStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'VOID';

export interface Voucher {
  id: string;
  reference: string;
  type: string;
  status: VoucherStatus;
  points: number;
  campaign: string | null;
  outlet: string | null;
  batchId: string | null;
  expiresAt: string | null;
  createdAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
}

export interface VoucherCounts {
  total: number;
  active: number;
  redeemed: number;
  expired: number;
  void: number;
}

export interface VouchersResponse extends Paginated<Voucher> {
  counts: VoucherCounts;
}

export interface VouchersParams {
  page?: number;
  search?: string;
  status?: string;
  type?: string;
  campaignId?: string;
  outletId?: string;
  batchId?: string;
}

export function useVouchers(params: VouchersParams = {}) {
  const {
    page = 1,
    search = '',
    status = '',
    type = '',
    campaignId = '',
    outletId = '',
    batchId = '',
  } = params;

  return useQuery({
    queryKey: queryKeys.vouchers({
      page,
      search,
      status,
      type,
      campaignId,
      outletId,
      batchId,
    }),
    queryFn: () => {
      // The API runs forbidNonWhitelisted validation — omit params entirely
      // rather than sending empty/"all" values.
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('search', search);
      if (status && status !== 'all') qs.set('status', status.toUpperCase());
      if (type && type !== 'all') qs.set('type', type.toUpperCase());
      if (campaignId && campaignId !== 'all') qs.set('campaignId', campaignId);
      if (outletId && outletId !== 'all') qs.set('outletId', outletId);
      if (batchId) qs.set('batchId', batchId);
      return api.get<VouchersResponse>(`/vouchers?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export interface VoidVoucherResult {
  id: string;
  status: 'VOID';
}

export function useVoidVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<VoidVoucherResult>(`/vouchers/${id}`),
    onSuccess: () => {
      toast.success('Voucher voided');
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not void voucher'),
  });
}

export interface VoidBatchResult {
  batchId: string;
  voided: number;
  skipped: number;
}

export function useVoidBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      api.post<VoidBatchResult>(`/vouchers/batch/${batchId}/void`, {}),
    onSuccess: (res) => {
      toast.success(
        `Batch voided — ${res.voided} voided, ${res.skipped} skipped`,
      );
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not void batch'),
  });
}
