'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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
import { useResetPassword } from '@/features/auth/use-auth-mutations';

const schema = z
  .object({
    identifier: z.string().min(3, 'Enter your email or phone'),
    code: z
      .string()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const params = useSearchParams();
  const identifier = params.get('identifier') ?? '';
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier },
  });

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Set a new password
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code we sent to your phone or email, then choose a
          new password.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={handleSubmit((v) =>
          reset.mutate({
            identifier: v.identifier,
            code: v.code,
            newPassword: v.newPassword,
          }),
        )}
      >
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or phone</Label>
            <IconInput
              id="identifier"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="username"
              {...register('identifier')}
            />
            <FieldError message={errors.identifier?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Reset code</Label>
            <IconInput
              id="code"
              icon={ShieldCheck}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              className="tracking-[0.4em] font-mono"
              {...register('code')}
            />
            <FieldError message={errors.code?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              icon={KeyRound}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              {...register('newPassword')}
            />
            <FieldError message={errors.newPassword?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              icon={Lock}
              autoComplete="new-password"
              {...register('confirm')}
            />
            <FieldError message={errors.confirm?.message} />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <Button
            type="submit"
            className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
            disabled={reset.isPending}
          >
            {reset.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t get a code?{' '}
            <Link
              href="/forgot-password"
              className="font-semibold text-amstel-red hover:underline"
            >
              Request a new one
            </Link>
          </p>
        </CardFooter>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
