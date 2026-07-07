'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { AuthTokens, AuthUser, persistSession, roleHome } from '@/lib/auth';
import { queryKeys } from '@/lib/query-keys';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  identifier: string;
  channel: 'SMS' | 'EMAIL';
  message: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
}

/** After tokens land, fetch /users/me and route to the role's dashboard. */
function useFinishLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return async (tokens: AuthTokens) => {
    persistSession(tokens);
    try {
      const me = await api.get<AuthUser>('/users/me');
      qc.setQueryData(queryKeys.me, me);
      router.replace(roleHome(me.role));
    } catch {
      router.replace('/customer');
    }
  };
}

export function useLogin() {
  const finish = useFinishLogin();
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post<AuthTokens>('/auth/login', payload),
    onSuccess: async (tokens) => {
      toast.success('Welcome back!');
      await finish(tokens);
    },
    onError: (err: Error) => toast.error(err.message || 'Login failed'),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post<RegisterResponse>('/auth/register', payload),
    onSuccess: (data) => {
      const via = data.channel === 'EMAIL' ? 'email' : 'SMS';
      toast.success(`Verification code sent to your ${via} instantly.`);
      router.push(`/verify-otp?identifier=${encodeURIComponent(data.identifier)}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Registration failed'),
  });
}

export function useVerifyOtp() {
  const finish = useFinishLogin();
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) =>
      api.post<AuthTokens>('/auth/verify', payload),
    onSuccess: async (tokens) => {
      toast.success('Verified!');
      await finish(tokens);
    },
    onError: (err: Error) => toast.error(err.message || 'Verification failed'),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (identifier: string) =>
      api.post('/auth/forgot-password', { identifier }),
    onSuccess: () =>
      toast.success('If the account exists, a reset link has been sent.'),
    onError: (err: Error) => toast.error(err.message || 'Request failed'),
  });
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      api.post('/auth/reset-password', payload),
    onSuccess: () => {
      toast.success('Password updated. Please sign in.');
      router.replace('/login');
    },
    onError: (err: Error) => toast.error(err.message || 'Reset failed'),
  });
}
