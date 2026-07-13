'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
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
  CreateUserInput,
  UserRow,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
} from '@/features/users/use-users';
import { useMe } from '@/lib/auth';

function name(r: UserRow) {
  return (
    r.fullName ||
    [r.firstName, r.lastName].filter(Boolean).join(' ') ||
    r.email ||
    '—'
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
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

const createSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().min(8, 'Enter a valid phone number').or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  password: z.string().min(6, 'At least 6 characters'),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().min(8, 'Enter a valid phone number').or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
});
type EditForm = z.infer<typeof editSchema>;

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const { data, isLoading } = useUsers({ page, search });
  const updateStatus = useUpdateUserStatus();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  // The API only lets a SUPER_ADMIN delete, so don't offer it to anyone else.
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  function onDelete() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '' },
  });

  function openCreate() {
    createForm.reset({ firstName: '', lastName: '', phone: '', email: '', password: '' });
    setCreateOpen(true);
  }

  function onCreate(values: CreateForm) {
    const payload: CreateUserInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || '',
      email: values.email || undefined,
      role: 'CUSTOMER',
      password: values.password,
    };
    createUser.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset();
      },
    });
  }

  function openEdit(r: UserRow) {
    setEditTarget(r);
    editForm.reset({
      firstName: r.firstName ?? '',
      lastName: r.lastName ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
    });
  }

  function onEdit(values: EditForm) {
    if (!editTarget) return;
    updateUser.mutate(
      {
        id: editTarget.id,
        data: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || undefined,
          email: values.email || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditTarget(null);
          editForm.reset();
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Search, register, edit and activate customer accounts."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Register customer
          </Button>
        }
      />
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
              { key: 'name', header: 'Name', render: (r: UserRow) => name(r) },
              {
                key: 'email',
                header: 'Email',
                render: (r: UserRow) => r.email ?? '—',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r: UserRow) => r.phone ?? '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: UserRow) => (
                  <Badge variant={statusVariant(r.status)} className="capitalize">
                    {r.status?.toLowerCase() ?? 'pending'}
                  </Badge>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (r: UserRow) => (
                  <Badge variant="outline" className="capitalize">
                    {r.role ?? 'customer'}
                  </Badge>
                ),
              },
              {
                key: 'points',
                header: 'Points',
                render: (r: UserRow) => (r.points ?? 0).toLocaleString(),
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
                  const isProtected = r.role === 'SUPER_ADMIN';
                  return (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Manage</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit details
                          </DropdownMenuItem>

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

                          {/* Delete — SUPER_ADMIN only, mirroring the API guards */}
                          {isSuperAdmin && !isProtected && r.id !== me?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete user
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

      {/* Register customer dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={createForm.handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amstel-red" /> Register customer
              </DialogTitle>
              <DialogDescription>
                Create a customer account. They sign in with the phone or email and the
                password you set here. You can activate the account afterwards.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" placeholder="Jean" {...createForm.register('firstName')} />
                  {createForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Uwase" {...createForm.register('lastName')} />
                  {createForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+250 7XX XXX XXX" {...createForm.register('phone')} />
                  {createForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input id="email" type="email" placeholder="name@amstel.com" {...createForm.register('email')} />
                  {createForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Min. 6 characters"
                  {...createForm.register('password')}
                />
                {createForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  createForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Registering…' : 'Register customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit customer dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <form onSubmit={editForm.handleSubmit(onEdit)}>
            <DialogHeader>
              <DialogTitle>Edit customer</DialogTitle>
              <DialogDescription>
                Update {editTarget ? name(editTarget) : 'customer'} contact details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First name</Label>
                  <Input id="edit-firstName" {...editForm.register('firstName')} />
                  {editForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last name</Label>
                  <Input id="edit-lastName" {...editForm.register('lastName')} />
                  {editForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" {...editForm.register('phone')} />
                  {editForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" {...editForm.register('email')} />
                  {editForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget ? name(deleteTarget) : ''}</strong> will lose
              access immediately and disappear from this list. Their points history
              and past redemptions are kept. This cannot be undone from the UI.
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
              {deleteUser.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
