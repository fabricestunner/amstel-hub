'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, KeyRound, Loader2, Mail, Phone, User } from 'lucide-react';
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
import { useRegister } from '@/features/auth/use-auth-mutations';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  password: z.string().min(6, 'At least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amstel-gold">
      {children}
    </p>
  );
}

export default function RegisterPage() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Create your account</CardTitle>
        <CardDescription>
          Join Amstel Rewards to earn points and unlock prizes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit((v) => registerMutation.mutate(v))}>
        <CardContent className="space-y-5 pb-4">
          {/* Section 1: Personal details */}
          <div>
            <SectionLabel>Your details</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    className="pl-9 focus-visible:ring-amstel-red/40"
                    {...register('firstName')}
                  />
                </div>
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  className="focus-visible:ring-amstel-red/40"
                  {...register('lastName')}
                />
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-amstel-gold/20" />

          {/* Section 2: Contact & security */}
          <div className="space-y-4">
            <SectionLabel>Contact &amp; Security</SectionLabel>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9 focus-visible:ring-amstel-red/40"
                  {...register('email')}
                />
              </div>
              <FieldError message={errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                  <span className="text-sm font-medium text-muted-foreground">🇷🇼 +250</span>
                </div>
                <div className="relative flex-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="7XX XXX XXX"
                    className="pl-9 focus-visible:ring-amstel-red/40"
                    {...register('phone')}
                  />
                </div>
              </div>
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="pl-9 focus-visible:ring-amstel-red/40"
                  {...register('password')}
                />
              </div>
              <FieldError message={errors.password?.message} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <Button
            type="submit"
            className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-amstel-red hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </>
  );
}
