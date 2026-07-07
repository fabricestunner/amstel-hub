'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, Lock } from 'lucide-react';
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
import { FieldError, PasswordInput } from '@/features/auth/form-fields';
import { useResetPassword } from '@/features/auth/use-auth-mutations';

const schema = z
  .object({
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Set a new password
        </CardTitle>
        <CardDescription>
          Choose a strong password you&apos;ll remember.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={handleSubmit((v) =>
          reset.mutate({ token, password: v.password }),
        )}
      >
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              icon={KeyRound}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              autoFocus
              {...register('password')}
            />
            <FieldError message={errors.password?.message} />
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
        <CardFooter className="pt-2 pb-6">
          <Button
            type="submit"
            className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
            disabled={reset.isPending || !token}
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
