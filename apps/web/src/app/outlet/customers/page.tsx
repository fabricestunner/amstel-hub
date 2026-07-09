'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, History, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useOutletDashboard,
  useOutletRedemptions,
  useRegisterOutletCustomer,
} from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';
import { toRwandaE164 } from '@/lib/phone';

const CURRENT_YEAR = new Date().getFullYear();
// Legal drinking age — customers must be 18+.
const MAX_BIRTH_YEAR = CURRENT_YEAR - 18;
const BIRTH_YEARS = Array.from({ length: 83 }, (_, i) => MAX_BIRTH_YEAR - i);

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    password: z.string().min(6, 'At least 6 characters'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    yearOfBirth: z.string().optional(),
  })
  .refine((v) => (v.phone && v.phone.trim().length >= 8) || !!v.email, {
    message: 'Enter a phone number or email',
    path: ['phone'],
  });
type RegisterForm = z.infer<typeof registerSchema>;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function OutletCustomersPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const { data, isLoading } = useOutletDashboard(outletId);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const { data: redemptions, isLoading: redemptionsLoading } =
    useOutletRedemptions(outletId, redemptionsPage);

  const [registerOpen, setRegisterOpen] = useState(false);
  const registerCustomer = useRegisterOutletCustomer();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { gender: undefined, yearOfBirth: '' },
  });

  function onRegister(values: RegisterForm) {
    const phone = values.phone?.trim();
    registerCustomer.mutate(
      {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: phone ? toRwandaE164(phone) : undefined,
        email: values.email || undefined,
        password: values.password,
        gender: values.gender,
        yearOfBirth: values.yearOfBirth
          ? Number(values.yearOfBirth)
          : undefined,
      },
      {
        onSuccess: () => {
          setRegisterOpen(false);
          reset();
        },
      },
    );
  }

  if (!meLoading && !outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customers" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No outlet linked"
          description="Your account is not associated with an outlet yet."
        />
      </div>
    );
  }

  const customers = data?.recentCustomers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customers registered through your outlet."
        actions={
          <Button onClick={() => setRegisterOpen(true)} disabled={!outletId}>
            <UserPlus className="h-4 w-4" /> Register customer
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {!isLoading && customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No customers yet"
              description="Registered customers will appear here."
            />
          ) : (
            <DataTable
              isLoading={isLoading}
              rows={customers}
              columns={[
                { key: 'name', header: 'Name' },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r) => (r.points ?? 0).toLocaleString(),
                },
                {
                  key: 'joinedAt',
                  header: 'Joined',
                  render: (r) => formatDate(r.joinedAt),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-amstel-gold" />
            Redemption history
          </CardTitle>
          <CardDescription>
            Every code your customers redeemed at this outlet, with points earned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!redemptionsLoading && (redemptions?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<History className="h-10 w-10" />}
              title="No redemptions yet"
              description="Customer code redemptions at your outlet will appear here."
            />
          ) : (
            <DataTable
              isLoading={redemptionsLoading}
              rows={redemptions?.items ?? []}
              page={redemptionsPage}
              totalPages={redemptions?.meta?.totalPages ?? 1}
              onPageChange={setRedemptionsPage}
              columns={[
                {
                  key: 'customerName',
                  header: 'Customer',
                  render: (r) => r.customerName ?? '—',
                },
                {
                  key: 'campaign',
                  header: 'Campaign',
                  render: (r) => r.campaign ?? '—',
                },
                {
                  key: 'codeType',
                  header: 'Type',
                  render: (r) => (
                    <Badge variant="outline" className="capitalize">
                      {r.codeType?.toLowerCase() ?? '—'}
                    </Badge>
                  ),
                },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r) => (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      +{r.points.toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'redeemedAt',
                  header: 'Redeemed at',
                  render: (r) => formatDateTime(r.redeemedAt),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Register walk-in customer dialog */}
      <Dialog
        open={registerOpen}
        onOpenChange={(o) => {
          setRegisterOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit(onRegister)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amstel-red" /> Register customer
              </DialogTitle>
              <DialogDescription>
                Onboard a walk-in customer to your outlet. Provide a phone number
                or email. They sign in with it and the password you set here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    autoComplete="off"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Uwase"
                    autoComplete="off"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+250 7XX XXX XXX"
                    autoComplete="off"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="off"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Gender <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={watch('gender') ?? ''}
                    onValueChange={(v) =>
                      setValue('gender', v as RegisterForm['gender'])
                    }
                  >
                    <SelectTrigger id="gender" aria-label="Gender">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearOfBirth">
                    Year of birth{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={watch('yearOfBirth') || ''}
                    onValueChange={(v) => setValue('yearOfBirth', v)}
                  >
                    <SelectTrigger id="yearOfBirth" aria-label="Year of birth">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {BIRTH_YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Min. 6 characters"
                  autoComplete="off"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRegisterOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={registerCustomer.isPending}>
                {registerCustomer.isPending ? 'Registering…' : 'Register customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
