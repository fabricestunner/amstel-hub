'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import {
  FieldError,
  IconInput,
  PasswordInput,
} from '@/features/auth/form-fields';
import { useRegister } from '@/features/auth/use-auth-mutations';
import { toRwandaE164 } from '@/lib/phone';

const CURRENT_YEAR = new Date().getFullYear();
// Legal drinking age — customers must be 18+.
const MAX_BIRTH_YEAR = CURRENT_YEAR - 18;
const BIRTH_YEARS = Array.from({ length: 83 }, (_, i) => MAX_BIRTH_YEAR - i);

const baseFields = {
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    message: 'Select your gender',
  }),
  yearOfBirth: z.coerce
    .number({ message: 'Select your year of birth' })
    .int()
    .min(1900, 'Enter a valid year')
    .max(MAX_BIRTH_YEAR, 'You must be at least 18 years old'),
  password: z.string().min(6, 'At least 6 characters'),
};

const phoneSchema = z.object({
  ...baseFields,
  contact: z.string().min(8, 'Enter a valid phone number'),
});

const emailSchema = z.object({
  ...baseFields,
  contact: z.string().email('Enter a valid email'),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type EmailValues = z.infer<typeof emailSchema>;

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amstel-red/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amstel-gold">
      {children}
    </p>
  );
}

export default function RegisterPage() {
  const registerMutation = useRegister();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');

  const schema = method === 'phone' ? phoneSchema : emailSchema;
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(v: FormValues) {
    const shared = {
      firstName: v.firstName,
      lastName: v.lastName,
      gender: v.gender,
      yearOfBirth: v.yearOfBirth,
      password: v.password,
    };
    const payload =
      method === 'phone'
        ? { ...shared, phone: toRwandaE164(v.contact) }
        : { ...shared, email: v.contact };
    registerMutation.mutate(payload);
  }

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Create your account</CardTitle>
        <CardDescription>
          Join Loyal Friends of Amstel. Earn points on Amstel and trade them for free beer.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 pb-4">
          {/* Section 1: Personal details */}
          <div>
            <SectionLabel>Your details</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <IconInput
                  id="firstName"
                  icon={User}
                  placeholder="Jean"
                  autoComplete="given-name"
                  autoFocus
                  {...register('firstName')}
                />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  autoComplete="family-name"
                  className="focus-visible:ring-amstel-red/40"
                  {...register('lastName')}
                />
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  defaultValue=""
                  className={selectClass}
                  {...register('gender')}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <FieldError message={errors.gender?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearOfBirth">Year of birth</Label>
                <select
                  id="yearOfBirth"
                  defaultValue=""
                  className={selectClass}
                  {...register('yearOfBirth')}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.yearOfBirth?.message} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-amstel-gold/20" />

          {/* Section 2: Contact & security */}
          <div className="space-y-4">
            <SectionLabel>Contact &amp; Security</SectionLabel>

            {/* Toggle: Phone or Email */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMethod('phone'); setValue('contact', ''); }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  method === 'phone'
                    ? 'border-amstel-red bg-amstel-red/5 text-amstel-red'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Phone className="mr-1.5 inline h-4 w-4" /> Phone
              </button>
              <button
                type="button"
                onClick={() => { setMethod('email'); setValue('contact', ''); }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  method === 'email'
                    ? 'border-amstel-red bg-amstel-red/5 text-amstel-red'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Mail className="mr-1.5 inline h-4 w-4" /> Email
              </button>
            </div>

            {method === 'phone' ? (
              <div className="space-y-2">
                <Label htmlFor="contact">Phone number</Label>
                <div className="flex gap-2">
                  <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                    <span className="text-sm font-medium text-muted-foreground">🇷🇼 +250</span>
                  </div>
                  <div className="flex-1">
                    <IconInput
                      id="contact"
                      icon={Phone}
                      type="tel"
                      inputMode="tel"
                      placeholder="7XX XXX XXX"
                      autoComplete="tel-national"
                      {...register('contact')}
                    />
                  </div>
                </div>
                <FieldError message={errors.contact?.message} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="contact">Email</Label>
                <IconInput
                  id="contact"
                  icon={Mail}
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('contact')}
                />
                <FieldError message={errors.contact?.message} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                icon={KeyRound}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                {...register('password')}
              />
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
