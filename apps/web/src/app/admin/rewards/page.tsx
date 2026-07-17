'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCampaigns } from '@/features/campaigns/use-campaigns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Reward,
  RewardRedemption,
  useApproveRedemption,
  useCreateReward,
  useDeleteReward,
  useFulfillRedemption,
  useRejectRedemption,
  useRewardRedemptions,
  useRewards,
  useUpdateReward,
} from '@/features/rewards/use-rewards';

// Mirrors the API's RewardType enum. These are the categories an admin can
// assign; TOURNAMENT_ENTRY drives special redemption behaviour on the backend.
const REWARD_TYPES = [
  'MERCHANDISE',
  'FREE_DRINK',
  'GIFT_ITEM',
  'CASH',
  'COUPON',
  'DIGITAL',
  'TOURNAMENT_ENTRY',
] as const;

const humanizeType = (t?: string) =>
  t ? t.replace(/_/g, ' ').toLowerCase() : '—';

const rewardSchema = z.object({
  // Required on create; on edit it's pre-filled from the reward and the field
  // is hidden (campaign can't be reassigned after creation).
  campaignId: z.string().uuid('Select a campaign'),
  name: z.string().min(2, 'Required'),
  description: z.string().optional(),
  type: z.enum(REWARD_TYPES, { message: 'Select a type' }),
  pointsCost: z.coerce.number().int().min(0),
  // Blank stock = unlimited inventory. Coerce '' to undefined so the optional
  // number validation doesn't choke on an empty input.
  totalInventory: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
});
type RewardForm = z.infer<typeof rewardSchema>;

function redemptionVariant(status?: string) {
  switch (status) {
    case 'APPROVED':
      return 'gold';
    case 'FULFILLED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'warning';
  }
}

function CatalogTab() {
  const { data: rewards, isLoading } = useRewards();
  const { data: campaignData } = useCampaigns();
  const campaigns = campaignData?.items ?? [];
  const create = useCreateReward();
  const update = useUpdateReward();
  const deleteReward = useDeleteReward();
  const [editing, setEditing] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RewardForm>({ resolver: zodResolver(rewardSchema) });

  useEffect(() => {
    if (open) {
      reset({
        campaignId: editing?.campaignId ?? undefined,
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        type: (editing?.type as RewardForm['type']) ?? undefined,
        pointsCost: editing?.pointsCost ?? 0,
        totalInventory: editing?.totalInventory ?? undefined,
      });
    }
  }, [open, editing, reset]);

  function onSubmit(values: RewardForm) {
    if (editing) {
      // Update is a partial patch; campaignId is fixed once created.
      update.mutate(
        {
          id: editing.id,
          input: {
            name: values.name,
            description: values.description,
            type: values.type,
            pointsCost: values.pointsCost,
            totalInventory: values.totalInventory,
          },
        },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      create.mutate(values, { onSuccess: () => setOpen(false) });
    }
  }

  function onDelete() {
    if (!deleteTarget) return;
    deleteReward.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
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
                render: (r: Reward) => (
                  <span className="capitalize">{humanizeType(r.type)}</span>
                ),
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
                  r.totalInventory == null
                    ? 'Unlimited'
                    : `${(r.remainingInventory ?? r.totalInventory).toLocaleString()} / ${r.totalInventory.toLocaleString()}`,
              },
              {
                key: 'actions',
                header: '',
                render: (r: Reward) => (
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
              <DialogTitle>{editing ? 'Edit reward' : 'New reward'}</DialogTitle>
              <DialogDescription>
                Configure the reward shown in the customer catalog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="campaignId">Campaign</Label>
                  <Controller
                    control={control}
                    name="campaignId"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="campaignId">
                          <SelectValue placeholder="Select a campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.campaignId && (
                    <p className="text-sm text-destructive">
                      {errors.campaignId.message}
                    </p>
                  )}
                </div>
              )}
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
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {REWARD_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">
                              {humanizeType(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && (
                    <p className="text-sm text-destructive">
                      {errors.type.message}
                    </p>
                  )}
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete reward?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be soft-deleted and
              removed from the customer catalog. This cannot be undone from
              the UI.
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
  const { data: redemptions, isLoading } = useRewardRedemptions();
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
              key: 'reward',
              header: 'Reward',
              render: (r: RewardRedemption) => r.reward?.name ?? '—',
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (r: RewardRedemption) =>
                [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') ||
                r.user?.id ||
                '—',
            },
            {
              key: 'collectionOutlet',
              header: 'Collection Outlet',
              render: (r: RewardRedemption) => r.collectionOutlet?.name ?? '—',
            },
            {
              key: 'points',
              header: 'Points',
              render: (r: RewardRedemption) =>
                (r.pointsSpent ?? 0).toLocaleString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: RewardRedemption) => (
                <Badge variant={redemptionVariant(r.status)} className="capitalize">
                  {r.status?.toLowerCase() ?? 'pending'}
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
                  {r.status === 'PENDING' && (
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
                  {r.status === 'APPROVED' && (
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
