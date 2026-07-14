'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Reward,
  RewardRedemption,
  useApproveRedemption,
  useCreateReward,
  useFulfillRedemption,
  useRejectRedemption,
  useRewardRedemptions,
  useRewards,
  useUpdateReward,
} from '@/features/rewards/use-rewards';

const rewardSchema = z.object({
  name: z.string().min(2, 'Required'),
  description: z.string().optional(),
  type: z.string().optional(),
  pointsCost: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0).optional(),
});
type RewardForm = z.infer<typeof rewardSchema>;

function redemptionVariant(status?: string) {
  switch (status) {
    case 'approved':
      return 'gold';
    case 'fulfilled':
      return 'success';
    case 'rejected':
      return 'destructive';
    default:
      return 'warning';
  }
}

function CatalogTab() {
  const { data: rewards, isLoading } = useRewards();
  const create = useCreateReward();
  const update = useUpdateReward();
  const [editing, setEditing] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RewardForm>({ resolver: zodResolver(rewardSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        type: editing?.type ?? '',
        pointsCost: editing?.pointsCost ?? 0,
        stock: editing?.stock ?? undefined,
      });
    }
  }, [open, editing, reset]);

  function onSubmit(values: RewardForm) {
    if (editing) {
      update.mutate(
        { id: editing.id, input: values },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      create.mutate(values, { onSuccess: () => setOpen(false) });
    }
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
          <Plus className="h-4 w-4" /> New reward
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
                key: 'type',
                header: 'Type',
                render: (r: Reward) => r.type ?? '—',
              },
              {
                key: 'pointsCost',
                header: 'Points',
                render: (r: Reward) => r.pointsCost.toLocaleString(),
              },
              {
                key: 'stock',
                header: 'Stock',
                render: (r: Reward) =>
                  r.stock == null ? 'Unlimited' : r.stock.toLocaleString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r: Reward) => (
                  <div className="flex justify-end">
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
              <DialogTitle>{editing ? 'Edit reward' : 'New reward'}</DialogTitle>
              <DialogDescription>
                Configure the reward shown in the customer catalog.
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input id="type" placeholder="merch" {...register('type')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsCost">Points</Label>
                  <Input
                    id="pointsCost"
                    type="number"
                    {...register('pointsCost')}
                  />
                  {errors.pointsCost && (
                    <p className="text-sm text-destructive">
                      {errors.pointsCost.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input id="stock" type="number" {...register('stock')} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function QueueTab() {
  const { data: redemptions, isLoading } = useRewardRedemptions('pending');
  const approve = useApproveRedemption();
  const reject = useRejectRedemption();
  const fulfill = useFulfillRedemption();

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable
          isLoading={isLoading}
          rows={redemptions ?? []}
          columns={[
            {
              key: 'rewardName',
              header: 'Reward',
              render: (r: RewardRedemption) => r.rewardName ?? r.rewardId ?? '—',
            },
            {
              key: 'customerName',
              header: 'Customer',
              render: (r: RewardRedemption) =>
                r.customerName ?? r.customerId ?? '—',
            },
            {
              key: 'collectionOutletName',
              header: 'Collection Outlet',
              render: (r: RewardRedemption) => r.collectionOutletName ?? '—',
            },
            {
              key: 'pointsCost',
              header: 'Points',
              render: (r: RewardRedemption) =>
                (r.pointsCost ?? 0).toLocaleString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: RewardRedemption) => (
                <Badge variant={redemptionVariant(r.status)} className="capitalize">
                  {r.status ?? 'pending'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Requested',
              render: (r: RewardRedemption) => formatDate(r.createdAt),
            },
            {
              key: 'actions',
              header: '',
              render: (r: RewardRedemption) => (
                <div className="flex justify-end gap-2">
                  {r.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => approve.mutate(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => reject.mutate(r.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => fulfill.mutate(r.id)}
                    >
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

export default function AdminRewardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards"
        description="Manage the catalog and process redemption requests."
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
