'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface UserRow {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  region?: string;
  points?: number;
  status?: string;
  createdAt?: string;
}

export interface UseUsersParams {
  page?: number;
  search?: string;
  role?: string;
  status?: string;
  staffOnly?: boolean;
}

export function useUsers(params: UseUsersParams = {}) {
  const { page = 1, search = '', role = '', status = '', staffOnly } = params;
  return useQuery({
    queryKey: queryKeys.users({ page, search, role, status, staffOnly }),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('search', search);
      if (role && role !== 'all') qs.set('role', role);
      if (status && status !== 'all') qs.set('status', status);
      if (staffOnly) qs.set('staffOnly', 'true');
      return api.get<Paginated<UserRow>>(`/users?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: string;
  password: string;
  regionId?: string;
  outletId?: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<UserRow>('/users', input),
    onSuccess: () => {
      toast.success('Account created');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['outlets'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create account'),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: () => {
      // Shared by the team and customers tables, so keep the copy role-neutral.
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['outlets'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete user'),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch<UserRow>(`/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update role'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<UserRow, 'firstName' | 'lastName' | 'email' | 'phone'>>;
    }) => api.patch<UserRow>(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('Customer updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update customer'),
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<UserRow>(`/users/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update status'),
  });
}
