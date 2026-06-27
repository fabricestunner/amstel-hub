'use client';

import { Gift } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Reward,
  useRedeemReward,
  useRewards,
} from '@/features/rewards/use-rewards';
import { useWallet } from '@/features/wallet/use-wallet';

export default function CustomerRewardsPage() {
  const [type, setType] = useState('all');
  const { data: rewards, isLoading } = useRewards(type === 'all' ? undefined : type);
  const { data: wallet } = useWallet();
  const redeem = useRedeemReward();
  const [selected, setSelected] = useState<Reward | null>(null);

  const available = wallet?.availablePoints ?? 0;

  const types = useMemo(() => {
    const set = new Set<string>();
    (rewards ?? []).forEach((r) => r.type && set.add(r.type));
    return Array.from(set);
  }, [rewards]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards catalog"
        description="Spend your points on exclusive Amstel rewards."
      />

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
      ) : !rewards || rewards.length === 0 ? (
        <EmptyState
          icon={<Gift className="h-10 w-10" />}
          title="No rewards available"
          description="Check back soon — new rewards are added regularly."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => {
            const affordable = available >= reward.pointsCost;
            const outOfStock = reward.stock != null && reward.stock <= 0;
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
                    <span className="text-sm text-muted-foreground">points</span>
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
                    onClick={() => setSelected(reward)}
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm redemption</DialogTitle>
            <DialogDescription>
              Redeem <strong>{selected?.name}</strong> for{' '}
              <strong>{selected?.pointsCost.toLocaleString()}</strong> points?
              Your balance after redemption will be{' '}
              {(available - (selected?.pointsCost ?? 0)).toLocaleString()} points.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              disabled={redeem.isPending}
              onClick={() => {
                if (!selected) return;
                redeem.mutate(selected.id, {
                  onSuccess: () => setSelected(null),
                });
              }}
            >
              {redeem.isPending ? 'Redeeming…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
