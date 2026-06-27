'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
}

export interface NotificationPreferences {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  promotions?: boolean;
  tournaments?: boolean;
  rewards?: boolean;
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      api.get<AppNotification[] | { items: AppNotification[] }>('/notifications'),
    select: (data) => (Array.isArray(data) ? data : data.items ?? []),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications }),
    onError: (err: Error) => toast.error(err.message || 'Could not update'),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update'),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () =>
      api.get<NotificationPreferences>('/notifications/preferences'),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      api.patch<NotificationPreferences>('/notifications/preferences', prefs),
    onMutate: async (prefs) => {
      await qc.cancelQueries({ queryKey: queryKeys.notificationPreferences });
      const prev = qc.getQueryData<NotificationPreferences>(
        queryKeys.notificationPreferences,
      );
      qc.setQueryData(queryKeys.notificationPreferences, {
        ...(prev ?? {}),
        ...prefs,
      });
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      qc.setQueryData(queryKeys.notificationPreferences, ctx?.prev);
      toast.error(err.message || 'Could not save preferences');
    },
    onSuccess: () => toast.success('Preferences saved'),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notificationPreferences }),
  });
}
