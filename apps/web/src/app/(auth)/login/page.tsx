'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/features/auth/use-auth-mutations';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Sign in</CardTitle>
        <CardDescription>
          Welcome back. Enter your details to access your dashboard.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit((v) => login.mutate(v))}>
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or phone</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="identifier"
                placeholder="you@example.com"
                autoComplete="username"
                className="pl-9 focus-visible:ring-amstel-red/40"
                {...register('identifier')}
              />
            </div>
            {errors.identifier && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-amstel-gold hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="pl-9 focus-visible:ring-amstel-red/40"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <Button
            type="submit"
            className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
            disabled={login.isPending}
          >
            {login.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/register" className="font-semibold text-amstel-red hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </>
  );
}
