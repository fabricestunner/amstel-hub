'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

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

export function useUsers(params: { page?: number; search?: string } = {}) {
  const { page = 1, search = '' } = params;
  return useQuery({
    queryKey: queryKeys.users(page, search),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('search', search);
      return api.get<Paginated<UserRow>>(`/users?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}
