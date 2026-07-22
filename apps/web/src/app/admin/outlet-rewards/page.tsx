'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, redemptionVariant } from '@/features/outlet-rewards/format';
import {
  OutletReward,
  OutletRewardRedemption,
  useApproveOutletRewardRedemption,
  useCreateOutletReward,
  useDeleteOutletReward,
  useFulfillOutletRewardRedemption,
  useOutletRewardRedemptions,
  useOutletRewards,
  useRejectOutletRewardRedemption,
  useUpdateOutletReward,
} from '@/features/outlet-rewards/use-outlet-rewards';

const outletRewardSchema = z.object({
  name: z.string().min(2, 'Required'),
  description: z.string().optional(),
  pointsCost: z.coerce.number().int().min(0),
  // Blank stock = unlimited inventory. Coerce a blank input to null (an
  // explicit "clear the cap" signal the API understands) so it still reaches
  // the request body — JSON.stringify would silently drop `undefined`.
  totalInventory: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(0).nullable(),
  ),
});
type OutletRewardForm = z.infer<typeof outletRewardSchema>;

function CatalogTab() {
  const { data: rewards, isLoading } = useOutletRewards();
  const create = useCreateOutletReward();
  const update = useUpdateOutletReward();
  const deleteReward = useDeleteOutletReward();
  const [editing, setEditing] = useState<OutletReward | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OutletReward | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OutletRewardForm>({ resolver: zodResolver(outletRewardSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        pointsCost: editing?.pointsCost ?? 0,
        totalInventory: editing?.totalInventory ?? null,
      });
    }
  }, [open, editing, reset]);

  function onSubmit(values: OutletRewardForm) {
    if (editing) {
      update.mutate(
        { id: editing.id, input: values },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      create.mutate(values, { onSuccess: () => setOpen(false) });
    }
  }

  function onDelete() {
    if (!deleteTarget) return;
    deleteReward.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New outlet reward
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={rewards ?? []}
            columns={[
              { key: 'name', header: 'Name' },
              {
                key: 'pointsCost',
                header: 'Points',
                render: (r: OutletReward) => r.pointsCost.toLocaleString(),
              },
              {
                key: 'stock',
                header: 'Stock',
                render: (r: OutletReward) =>
                  r.totalInventory == null
                    ? 'Unlimited'
                    : `${(r.remainingInventory ?? r.totalInventory).toLocaleString()} / ${r.totalInventory.toLocaleString()}`,
              },
              {
                key: 'actions',
                header: '',
                render: (r: OutletReward) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit outlet reward' : 'New outlet reward'}</DialogTitle>
              <DialogDescription>
                Prizes outlets redeem with their own points (1 crate = 1 point).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pointsCost">Points</Label>
                  <Input id="pointsCost" type="number" {...register('pointsCost')} />
                  {errors.pointsCost && (
                    <p className="text-sm text-destructive">
                      {errors.pointsCost.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalInventory">Total stock</Label>
                  <Input
                    id="totalInventory"
                    type="number"
                    placeholder="Unlimited"
                    {...register('totalInventory')}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete outlet reward?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be soft-deleted and removed
              from the outlet catalog. This cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteReward.isPending}
              onClick={onDelete}
            >
              {deleteReward.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function QueueTab() {
  const { data: redemptions, isLoading } = useOutletRewardRedemptions();
  const approve = useApproveOutletRewardRedemption();
  const reject = useRejectOutletRewardRedemption();
  const fulfill = useFulfillOutletRewardRedemption();

  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable
          isLoading={isLoading}
          rows={redemptions ?? []}
          columns={[
            {
              key: 'reward',
              header: 'Reward',
              render: (r: OutletRewardRedemption) => r.outletReward?.name ?? '—',
            },
            {
              key: 'outlet',
              header: 'Outlet',
              render: (r: OutletRewardRedemption) => r.outlet?.name ?? '—',
            },
            {
              key: 'points',
              header: 'Points',
              render: (r: OutletRewardRedemption) => (r.pointsSpent ?? 0).toLocaleString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: OutletRewardRedemption) => (
                <Badge variant={redemptionVariant(r.status)} className="capitalize">
                  {r.status?.toLowerCase() ?? 'pending'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Requested',
              render: (r: OutletRewardRedemption) => formatDate(r.createdAt),
            },
            {
              key: 'actions',
              header: '',
              render: (r: OutletRewardRedemption) => (
                <div className="flex justify-end gap-2">
                  {r.status === 'PENDING' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => approve.mutate(r.id)}>
                        Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => reject.mutate(r.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button variant="gold" size="sm" onClick={() => fulfill.mutate(r.id)}>
                      Fulfill
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export default function AdminOutletRewardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Outlet Rewards"
        description="Manage the prize catalog outlets redeem with their own points, and process redemption requests."
      />
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="queue">Approval queue</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogTab />
        </TabsContent>
        <TabsContent value="queue">
          <QueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
