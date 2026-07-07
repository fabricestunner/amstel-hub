'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
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
import { FieldError, IconInput } from '@/features/auth/form-fields';
import { useForgotPassword } from '@/features/auth/use-auth-mutations';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter your email or phone and we&apos;ll send you reset instructions.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit((v) => forgot.mutate(v.identifier))}>
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
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <Button
            type="submit"
            className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
            disabled={forgot.isPending}
          >
            {forgot.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link
              href="/login"
              className="font-semibold text-amstel-red hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </>
  );
}
