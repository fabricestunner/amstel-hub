'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface PlatformSettings {
  programName: string;
  pointsLabel: string;
  defaultPointsPerCode: number;
  defaultPointsExpiryDays: number;
  supportEmail: string;
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.get<PlatformSettings>('/settings'),
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlatformSettings>) =>
      api.put<PlatformSettings>('/settings', input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings, data);
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save settings'),
  });
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch('/users/me', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update profile'),
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.patch('/users/me/password', input),
    onSuccess: () => toast.success('Password changed'),
    onError: (err: Error) => toast.error(err.message || 'Could not change password'),
  });
}
