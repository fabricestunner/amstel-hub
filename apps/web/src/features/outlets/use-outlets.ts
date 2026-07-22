'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface Outlet {
  id: string;
  name: string;
  code?: string;
  region?: string;
  province?: string;
  district?: string;
  city?: string;
  address?: string;
  status?: 'active' | 'inactive' | string;
  pointsGenerated?: number;
  customers?: number;
  crates?: number;
  nationalRank?: number;
  regionalRank?: number;
}

export interface GeoItem {
  id: string;
  name: string;
  regionId?: string;
}

export interface OutletDashboard {
  outletId: string;
  name?: string;
  nationalRank?: number;
  regionalRank?: number;
  availablePoints?: number;
  campaignSales?: number;
  pointsGenerated?: number;
  crates?: number;
  customersRegistered?: number;
  rewardsEarned?: number;
  tournamentEntries?: number;
  campaignPerformance?: {
    campaignId?: string | null;
    campaign: string;
    redemptions: number;
    points: number;
  }[];
  pointsRedeemed?: number;
  recentRewards?: {
    id: string;
    rewardName: string;
    customerName: string;
    pointsSpent: number;
    status: string;
    createdAt?: string;
  }[];
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

export function useRegions() {
  return useQuery({
    queryKey: ['outlets', 'regions'],
    queryFn: () => api.get<GeoItem[]>('/outlets/regions'),
    staleTime: 5 * 60_000,
  });
}

/** Load all provinces (Rwanda has 5 incl. Kigali City). Each item includes regionId for form submission. */
export function useProvinces() {
  return useQuery({
    queryKey: ['outlets', 'provinces'],
    queryFn: () => api.get<GeoItem[]>('/outlets/provinces'),
    staleTime: 5 * 60_000,
  });
}

export function useDistricts(provinceId?: string) {
  return useQuery({
    queryKey: ['outlets', 'districts', provinceId],
    queryFn: () =>
      api.get<GeoItem[]>(
        `/outlets/districts${provinceId ? `?provinceId=${provinceId}` : ''}`,
      ),
    enabled: !!provinceId,
    staleTime: 5 * 60_000,
  });
}

export interface CreateOutletInput {
  name: string;
  code: string;
  address?: string;
  regionId: string;
  provinceId: string;
  districtId: string;
  managerId?: string;
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOutletInput) =>
      api.post<Outlet>('/outlets', input),
    onSuccess: () => {
      toast.success('Outlet created');
      qc.invalidateQueries({ queryKey: ['outlets'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create outlet'),
  });
}

export function useUpdateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateOutletInput> & {
        status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      };
    }) => api.put<Outlet>(`/outlets/${id}`, data),
    onSuccess: () => {
      toast.success('Outlet updated');
      qc.invalidateQueries({ queryKey: ['outlets'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update outlet'),
  });
}

export function useDeleteOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/outlets/${id}`),
    onSuccess: () => {
      toast.success('Outlet deleted');
      qc.invalidateQueries({ queryKey: ['outlets'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete outlet'),
  });
}

export interface RegisterOutletCustomerInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  password: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  yearOfBirth?: number;
}

export interface RegisteredCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
}

/** Outlet manager registers a walk-in customer onto their own outlet. */
export function useRegisterOutletCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterOutletCustomerInput) =>
      api.post<RegisteredCustomer>('/users/outlet-customers', input),
    onSuccess: () => {
      toast.success('Customer registered');
      qc.invalidateQueries({ queryKey: ['outlet-dashboard'] });
      qc.invalidateQueries({ queryKey: ['outlets'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Could not register customer'),
  });
}

export function useOutletDashboard(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outletDashboard(id ?? ''),
    queryFn: () => api.get<OutletDashboard>(`/outlets/${id}/dashboard`),
    enabled: !!id,
  });
}

export interface OutletRedemption {
  id: string;
  customerId: string;
  customerName?: string;
  codeType?: string;
  campaign?: string;
  points: number;
  redeemedAt: string;
}

export function useOutletRedemptions(
  id: string | undefined,
  page = 1,
  userId?: string,
) {
  return useQuery({
    queryKey: ['outlets', id, 'redemptions', page, userId ?? ''],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (userId) qs.set('userId', userId);
      return api.get<Paginated<OutletRedemption>>(
        `/outlets/${id}/redemptions?${qs.toString()}`,
      );
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export interface OutletVoucher {
  id: string;
  reference: string;
  type: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'REVOKED' | string;
  points: number;
  campaign?: string;
  batchId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  redeemedAt?: string | null;
  redeemedBy?: string | null;
}

export interface OutletVouchersResponse extends Paginated<OutletVoucher> {
  counts: { total: number; active: number; redeemed: number };
}

export function useOutletVouchers(
  id: string | undefined,
  page = 1,
  status = '',
) {
  return useQuery({
    queryKey: ['outlets', id, 'vouchers', page, status],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'all') qs.set('status', status.toUpperCase());
      return api.get<OutletVouchersResponse>(
        `/outlets/${id}/vouchers?${qs.toString()}`,
      );
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}
