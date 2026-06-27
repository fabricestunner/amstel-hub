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
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface VerifyPhonePayload {
  phone: string;
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
      api.post<{ phone?: string }>('/auth/register', payload),
    onSuccess: (_data, vars) => {
      toast.success('Account created. Verify your phone to continue.');
      router.push(`/verify-otp?phone=${encodeURIComponent(vars.phone)}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Registration failed'),
  });
}

export function useVerifyPhone() {
  const finish = useFinishLogin();
  return useMutation({
    mutationFn: (payload: VerifyPhonePayload) =>
      api.post<AuthTokens>('/auth/verify-phone', payload),
    onSuccess: async (tokens) => {
      toast.success('Phone verified!');
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
