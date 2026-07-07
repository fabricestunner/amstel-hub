'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  Outlet,
  useCreateOutlet,
  useDeleteOutlet,
  useDistricts,
  useOutlets,
  useProvinces,
  useUpdateOutlet,
} from '@/features/outlets/use-outlets';
import { useUsers } from '@/features/users/use-users';

const outletSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z
    .string()
    .min(2, 'Code is required')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers and hyphens'),
  address: z.string().optional(),
  provinceId: z.string().min(1, 'Select a province'),
  districtId: z.string().min(1, 'Select a district'),
  managerId: z.string().optional(),
});
type OutletForm = z.infer<typeof outletSchema>;

export default function AdminOutletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Outlet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Outlet | null>(null);

  const { data, isLoading } = useOutlets({ page, search, status: statusFilter });
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const deleteOutlet = useDeleteOutlet();

  const outlets = useMemo(
    () => (Array.isArray(data) ? data : (data?.items ?? [])),
    [data],
  );
  const totalPages = Array.isArray(data) ? 1 : (data?.meta?.totalPages ?? 1);

  // All provinces for filter bar and form
  const { data: provinces = [] } = useProvinces();

  // Outlet managers available to assign at creation time
  const { data: managersData } = useUsers({ role: 'OUTLET_MANAGER', page: 1 });
  const managers = managersData?.items ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OutletForm>({ resolver: zodResolver(outletSchema) });

  const selectedProvinceId = watch('provinceId');
  const { data: districts = [] } = useDistricts(selectedProvinceId);

  // Reset district when province changes
  useEffect(() => {
    setValue('districtId', '');
  }, [selectedProvinceId, setValue]);

  function onCreate(values: OutletForm) {
    // Derive regionId from the selected province object
    const province = provinces.find((p) => p.id === values.provinceId);
    createOutlet.mutate(
      {
        name: values.name,
        code: values.code,
        address: values.address,
        regionId: province?.regionId ?? '',
        provinceId: values.provinceId,
        districtId: values.districtId,
        managerId: values.managerId || undefined,
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
    deleteOutlet.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  // Client-side province filter on the table
  const filteredOutlets = useMemo(
    () =>
      provinceFilter === 'all'
        ? outlets
        : outlets.filter((o) => o.province === provinceFilter),
    [outlets, provinceFilter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outlets"
        description="Manage registered outlets across Rwanda's provinces and districts."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add outlet
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select
          value={provinceFilter}
          onValueChange={(v) => { setProvinceFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All provinces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All provinces</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={filteredOutlets}
            searchValue={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            columns={[
              {
                key: 'name',
                header: 'Outlet',
                render: (r: Outlet) => (
                  <div>
                    <div className="font-medium">{r.name}</div>
                    {r.code && (
                      <div className="text-xs text-muted-foreground">{r.code}</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'location',
                header: 'Location',
                render: (r: Outlet) => (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="text-sm leading-tight">
                      <div className="font-medium">{r.district ?? '—'}</div>
                      <div className="text-muted-foreground">{r.province ?? '—'}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'customers',
                header: 'Customers',
                render: (r: Outlet) => (r.customers ?? 0).toLocaleString(),
              },
              {
                key: 'pointsGenerated',
                header: 'Points',
                render: (r: Outlet) => (r.pointsGenerated ?? 0).toLocaleString(),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: Outlet) => (
                  <Badge
                    variant={r.status === 'active' ? 'success' : 'secondary'}
                    className="capitalize"
                  >
                    {r.status ?? 'active'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (r: Outlet) => (
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

                        <DropdownMenuItem onClick={() => setEditTarget(r)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit details
                        </DropdownMenuItem>

                        {r.status !== 'active' && (
                          <DropdownMenuItem
                            disabled={updateOutlet.isPending}
                            onClick={() =>
                              updateOutlet.mutate({ id: r.id, data: { status: 'active' } })
                            }
                          >
                            Activate
                          </DropdownMenuItem>
                        )}
                        {r.status === 'active' && (
                          <DropdownMenuItem
                            disabled={updateOutlet.isPending}
                            onClick={() =>
                              updateOutlet.mutate({ id: r.id, data: { status: 'inactive' } })
                            }
                          >
                            Deactivate
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* ── Create outlet dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle>Add outlet</DialogTitle>
              <DialogDescription>
                Register a new outlet using Rwanda&apos;s province → district format.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name + Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Outlet name</Label>
                  <Input id="name" placeholder="Pili Pili Bar" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    placeholder="OUT-KGL-001"
                    className="uppercase"
                    {...register('code')}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>

              {/* Province */}
              <div className="space-y-2">
                <Label>Province</Label>
                <Select
                  value={selectedProvinceId}
                  onValueChange={(v) => setValue('provinceId', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province…" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.provinceId && (
                  <p className="text-xs text-destructive">{errors.provinceId.message}</p>
                )}
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label>District</Label>
                <Select
                  value={watch('districtId')}
                  onValueChange={(v) => setValue('districtId', v, { shouldValidate: true })}
                  disabled={!selectedProvinceId || districts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedProvinceId
                          ? 'Select a province first'
                          : 'Select district…'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.districtId && (
                  <p className="text-xs text-destructive">{errors.districtId.message}</p>
                )}
              </div>

              {/* Manager */}
              <div className="space-y-2">
                <Label>
                  Manager{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  value={watch('managerId') || ''}
                  onValueChange={(v) => setValue('managerId', v)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        managers.length === 0
                          ? 'No outlet managers yet'
                          : 'Assign a manager…'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {[m.firstName, m.lastName].filter(Boolean).join(' ') ||
                          m.email ||
                          m.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Create managers under Team. A manager already running another
                  outlet cannot be reassigned.
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Address{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="address"
                  placeholder="KG 123 St, Kigali"
                  {...register('address')}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCreateOpen(false); reset(); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOutlet.isPending}>
                {createOutlet.isPending ? 'Creating…' : 'Create outlet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit outlet dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          {editTarget && (
            <EditOutletForm
              outlet={editTarget}
              provinces={provinces}
              managers={managers}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete outlet?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be soft-deleted. This
              cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOutlet.isPending}
              onClick={onDelete}
            >
              {deleteOutlet.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditOutletForm({
  outlet,
  provinces,
  managers,
  onClose,
}: {
  outlet: Outlet;
  provinces: { id: string; name: string; regionId?: string }[];
  managers: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string }[];
  onClose: () => void;
}) {
  const updateOutlet = useUpdateOutlet();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OutletForm>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: outlet.name,
      code: outlet.code ?? '',
      address: outlet.address ?? '',
      provinceId: provinces.find((p) => p.name === outlet.province)?.id ?? '',
      districtId: '',
      managerId: '',
    },
  });

  const selectedProvinceId = watch('provinceId');
  const { data: districts = [] } = useDistricts(selectedProvinceId);

  // Resolve initial district once districts load
  useEffect(() => {
    if (!outlet.district || districts.length === 0) return;
    const match = districts.find((d) => d.name === outlet.district);
    if (match) setValue('districtId', match.id);
  }, [districts, outlet.district, setValue]);

  function onSubmit(values: OutletForm) {
    const province = provinces.find((p) => p.id === values.provinceId);
    updateOutlet.mutate(
      {
        id: outlet.id,
        data: {
          name: values.name,
          code: values.code,
          address: values.address,
          regionId: province?.regionId,
          provinceId: values.provinceId,
          districtId: values.districtId,
          managerId: values.managerId || undefined,
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Edit outlet</DialogTitle>
        <DialogDescription>Update {outlet.name} details.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Outlet name</Label>
            <Input id="edit-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-code">Code</Label>
            <Input id="edit-code" className="uppercase" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Province</Label>
          <Select
            value={selectedProvinceId}
            onValueChange={(v) => setValue('provinceId', v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select province…" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.provinceId && (
            <p className="text-xs text-destructive">{errors.provinceId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>District</Label>
          <Select
            value={watch('districtId')}
            onValueChange={(v) => setValue('districtId', v, { shouldValidate: true })}
            disabled={!selectedProvinceId || districts.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select district…" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.districtId && (
            <p className="text-xs text-destructive">{errors.districtId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Manager <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={watch('managerId') || ''}
            onValueChange={(v) => setValue('managerId', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign a manager…" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || m.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-address">
            Address <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="edit-address" {...register('address')} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { onClose(); reset(); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateOutlet.isPending}>
          {updateOutlet.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  );
}
