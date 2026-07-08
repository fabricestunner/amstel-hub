'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useOutlets } from '@/features/outlets/use-outlets';
import {
  UserRow,
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUpdateUserStatus,
  useUsers,
} from '@/features/users/use-users';
import { useMe } from '@/lib/auth';

const STAFF_ROLES = [
  { value: 'CAMPAIGN_MANAGER', label: 'Campaign Manager' },
  { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
  { value: 'OUTLET_MANAGER', label: 'Outlet Manager' },
  { value: 'PROMOTER', label: 'Promoter' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CAMPAIGN_MANAGER: 'Campaign Manager',
  REGIONAL_MANAGER: 'Regional Manager',
  OUTLET_MANAGER: 'Outlet Manager',
  PROMOTER: 'Promoter',
  CUSTOMER: 'Customer',
};

function roleLabel(role?: string) {
  return role ? (ROLE_LABELS[role] ?? role) : '—';
}

function statusVariant(status?: string) {
  switch (status) {
    case 'ACTIVE':
      return 'success' as const;
    case 'SUSPENDED':
      return 'warning' as const;
    case 'BANNED':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function displayName(r: UserRow) {
  return (
    r.fullName ||
    [r.firstName, r.lastName].filter(Boolean).join(' ') ||
    r.email ||
    r.phone ||
    '—'
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const createSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  role: z.string().min(1, 'Select a role'),
  password: z.string().min(6, 'At least 6 characters'),
  outletId: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function AdminTeamPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const { data, isLoading } = useUsers({
    page,
    search,
    role: roleFilter,
    status: statusFilter,
    staffOnly: true,
  });

  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  const { data: outletsData } = useOutlets({ page: 1 });
  const outlets = Array.isArray(outletsData)
    ? outletsData
    : (outletsData?.items ?? []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: '', outletId: '' },
  });

  const selectedRole = watch('role');

  function onCreate(values: CreateForm) {
    createUser.mutate(
      {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        email: values.email || undefined,
        role: values.role,
        password: values.password,
        outletId:
          values.role === 'OUTLET_MANAGER' ? values.outletId || undefined : undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          reset();
        },
      },
    );
  }

  function onDelete() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage staff accounts — managers and promoters."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff roles</SelectItem>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="BANNED">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={data?.items ?? []}
            searchValue={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            page={page}
            totalPages={data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
            columns={[
              {
                key: 'name',
                header: 'Member',
                render: (r: UserRow) => (
                  <div>
                    <div className="font-medium">{displayName(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.email ?? r.phone ?? '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (r: UserRow) => (
                  <Badge variant="outline">{roleLabel(r.role)}</Badge>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: UserRow) => (
                  <Badge variant={statusVariant(r.status)} className="capitalize">
                    {r.status?.toLowerCase() ?? 'active'}
                  </Badge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Joined',
                render: (r: UserRow) => formatDate(r.createdAt),
              },
              {
                key: 'actions',
                header: '',
                render: (r: UserRow) => {
                  const isSelf = r.id === me?.id;
                  const isProtected = r.role === 'SUPER_ADMIN';
                  return (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Open actions menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Manage</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* Status changes */}
                          {r.status !== 'ACTIVE' && (
                            <DropdownMenuItem
                              disabled={isProtected || updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: r.id, status: 'ACTIVE' })
                              }
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                          {r.status !== 'SUSPENDED' && (
                            <DropdownMenuItem
                              disabled={isProtected || updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: r.id, status: 'SUSPENDED' })
                              }
                            >
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {r.status !== 'BANNED' && (
                            <DropdownMenuItem
                              disabled={isProtected || updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: r.id, status: 'BANNED' })
                              }
                            >
                              Ban
                            </DropdownMenuItem>
                          )}

                          {/* Role change — SUPER_ADMIN only */}
                          {isSuperAdmin && !isProtected && !isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Change role
                              </DropdownMenuLabel>
                              {STAFF_ROLES.filter((sr) => sr.value !== r.role).map(
                                (sr) => (
                                  <DropdownMenuItem
                                    key={sr.value}
                                    disabled={updateRole.isPending}
                                    onClick={() =>
                                      updateRole.mutate({ id: r.id, role: sr.value })
                                    }
                                  >
                                    Set as {sr.label}
                                  </DropdownMenuItem>
                                ),
                              )}
                            </>
                          )}

                          {/* Delete — SUPER_ADMIN only */}
                          {isSuperAdmin && !isProtected && !isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(r)}
                              >
                                Remove member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                },
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create member dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amstel-red" /> Add team member
              </DialogTitle>
              <DialogDescription>
                Create a staff account. They sign in with the phone or email and the
                password you set here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" placeholder="Jean" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Uwase" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+250 7XX XXX XXX" {...register('phone')} />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input id="email" type="email" placeholder="name@amstel.com" {...register('email')} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setValue('role', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-destructive">{errors.role.message}</p>
                )}
              </div>

              {/* Outlet picker — only for outlet managers */}
              {selectedRole === 'OUTLET_MANAGER' && (
                <div className="space-y-2">
                  <Label>Assign to outlet</Label>
                  <Select
                    value={watch('outletId')}
                    onValueChange={(v) => setValue('outletId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an outlet…" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                          {o.district ? ` · ${o.district}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Outlets that already have a manager will be rejected.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Min. 6 characters"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Adding…' : 'Add member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget ? displayName(deleteTarget) : ''}</strong> will lose
              access immediately. If they manage an outlet it will be unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={onDelete}
            >
              {deleteUser.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isSuperAdmin && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Role changes and member removal require a Super Admin.
        </p>
      )}
    </div>
  );
}
