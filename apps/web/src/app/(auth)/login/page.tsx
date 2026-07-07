'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  FieldError,
  IconInput,
  PasswordInput,
} from '@/features/auth/form-fields';
import { useLogin } from '@/features/auth/use-auth-mutations';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
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
            <IconInput
              id="identifier"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="username"
              autoFocus
              {...register('identifier')}
            />
            <FieldError message={errors.identifier?.message} />
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
            <PasswordInput
              id="password"
              icon={Lock}
              autoComplete="current-password"
              {...register('password')}
            />
            <FieldError message={errors.password?.message} />
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
