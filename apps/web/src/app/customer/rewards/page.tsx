'use client';

import { AlertCircle, Gift, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MyRewardRedemption,
  Reward,
  useMyRewardRedemptions,
  useRedeemReward,
  useRewards,
} from '@/features/rewards/use-rewards';
import { Outlet, useCustomerOutlets } from '@/features/tournaments/use-tournaments';
import { useWallet } from '@/features/wallet/use-wallet';

type StatusVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline';

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PENDING: 'warning',
  APPROVED: 'secondary',
  FULFILLED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
};

function statusVariant(status?: string): StatusVariant {
  return (status && STATUS_VARIANT[status]) || 'outline';
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ClaimedRewards() {
  const { data, isLoading, isError, error, refetch } = useMyRewardRedemptions();
  const redemptions = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-2">
          <p>
            {(error as Error)?.message ??
              'We could not load your claimed rewards.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <EmptyState
        icon={<PackageCheck className="h-10 w-10" />}
        title="No rewards claimed yet"
        description="Redeem your points from the Available rewards tab to see them here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Your claimed rewards</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Reward
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Points spent
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Date claimed
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Reference
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {redemptions.map((r: MyRewardRedemption) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">
                {r.reward?.name ?? 'Reward'}
              </td>
              <td className="px-4 py-3 tabular-nums text-secondary">
                {(r.pointsSpent ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(r.createdAt)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {r.fulfillmentRef ?? '—'}
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(r.status)} className="capitalize">
                  {(r.status ?? 'pending').toLowerCase()}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerRewardsPage() {
  const [type, setType] = useState('all');
  const {
    data: rewards,
    isLoading,
    isError,
    error,
    refetch,
  } = useRewards(type === 'all' ? undefined : type);
  const { data: wallet } = useWallet();
  const { data: customerOutlets } = useCustomerOutlets();
  const redeem = useRedeemReward();
  const [selected, setSelected] = useState<Reward | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [outletDialogOpen, setOutletDialogOpen] = useState(false);

  const available = wallet?.availablePoints ?? 0;

  const types = useMemo(() => {
    const set = new Set<string>();
    (rewards ?? []).forEach((r) => r.type && set.add(r.type));
    return Array.from(set);
  }, [rewards]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards"
        description="Spend your points on Amstel rewards and track what you've claimed."
      />

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available">Available rewards</TabsTrigger>
          <TabsTrigger value="claimed">Claimed</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          <Tabs value={type} onValueChange={setType}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {types.map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-2">
                <p>
                  {(error as Error)?.message ??
                    'We could not load the rewards catalog.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : !rewards || rewards.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-10 w-10" />}
              title="No rewards available"
              description="Check back soon. We add new rewards regularly."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => {
                const affordable = available >= reward.pointsCost;
                const outOfStock =
                  reward.remainingInventory != null &&
                  reward.remainingInventory <= 0;
                return (
                  <Card key={reward.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{reward.name}</CardTitle>
                        {reward.type && (
                          <Badge variant="outline" className="capitalize">
                            {reward.type}
                          </Badge>
                        )}
                      </div>
                      {reward.description && (
                        <CardDescription>{reward.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-secondary">
                          {reward.pointsCost.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          points
                        </span>
                      </div>
                      {outOfStock && (
                        <Badge variant="destructive" className="mt-2">
                          Out of stock
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="gold"
                        className="w-full"
                        disabled={!affordable || outOfStock}
                        onClick={() => {
                          setSelected(reward);
                          setSelectedOutletId(null);
                          setOutletDialogOpen(true);
                        }}
                      >
                        {!affordable
                          ? 'Not enough points'
                          : outOfStock
                            ? 'Unavailable'
                            : 'Redeem'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claimed" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Your claimed rewards</h2>
            <p className="text-sm text-muted-foreground">
              Rewards you&apos;ve redeemed and their fulfillment status.
            </p>
          </div>
          <ClaimedRewards />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Collection Outlet</DialogTitle>
            <DialogDescription>
              Choose the outlet where you will collect your reward. You can only select an outlet where you have previously scanned a code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">{selected?.name}</div>
              <div className="text-muted-foreground">
                Cost: {selected?.pointsCost.toLocaleString()} points
              </div>
            </div>
            {!customerOutlets || customerOutlets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need to scan a code at an outlet before you can redeem rewards.
              </p>
            ) : (
              <div className="space-y-2">
                {customerOutlets.map((outlet: Outlet) => (
                  <button
                    key={outlet.id}
                    type="button"
                    onClick={() => setSelectedOutletId(outlet.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedOutletId === outlet.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">{outlet.name}</div>
                    <div className="text-xs text-muted-foreground">Code: {outlet.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              disabled={!selectedOutletId || redeem.isPending}
              onClick={() => {
                if (!selected || !selectedOutletId) return;
                redeem.mutate({ rewardId: selected.id, collectionOutletId: selectedOutletId }, {
                  onSuccess: () => setSelected(null),
                });
              }}
            >
              {redeem.isPending ? 'Redeeming…' : 'Confirm Redemption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
