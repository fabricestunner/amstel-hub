'use client';

import { Coins } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, redemptionVariant } from '@/features/outlet-rewards/format';
import { useOutletDashboard } from '@/features/outlets/use-outlets';
import {
  OutletReward,
  OutletRewardRedemption,
  useOutletRewardRedemptions,
  useOutletRewards,
  useRedeemOutletReward,
} from '@/features/outlet-rewards/use-outlet-rewards';
import { useMe } from '@/lib/auth';

function CatalogTab({ availablePoints }: { availablePoints: number }) {
  const { data: rewards, isLoading } = useOutletRewards();
  const redeem = useRedeemOutletReward();

  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable
          isLoading={isLoading}
          rows={rewards ?? []}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'description', header: 'Description', render: (r: OutletReward) => r.description ?? '—' },
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
                  : `${(r.remainingInventory ?? r.totalInventory).toLocaleString()} left`,
            },
            {
              key: 'actions',
              header: '',
              render: (r: OutletReward) => {
                const canAfford = availablePoints >= r.pointsCost;
                const outOfStock = r.totalInventory != null && (r.remainingInventory ?? 0) <= 0;
                return (
                  <Button
                    size="sm"
                    disabled={!canAfford || outOfStock || redeem.isPending}
                    onClick={() => redeem.mutate(r.id)}
                  >
                    {outOfStock ? 'Out of stock' : canAfford ? 'Redeem' : 'Not enough points'}
                  </Button>
                );
              },
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function HistoryTab() {
  const { data: redemptions, isLoading } = useOutletRewardRedemptions();
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
              key: 'points',
              header: 'Points spent',
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
          ]}
        />
      </CardContent>
    </Card>
  );
}

export default function OutletRewardsPage() {
  const { data: me } = useMe();
  const outletId = me?.outletId ?? undefined;
  const { data: dashboard, isLoading: dashboardLoading } = useOutletDashboard(outletId);
  const availablePoints = dashboard?.availablePoints ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outlet Rewards"
        description="Redeem prizes using your outlet's points."
      />
      <Card className="border-secondary/40 bg-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-secondary" />
            Available points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={
              !outletId
                ? 'text-lg font-semibold text-muted-foreground'
                : 'text-4xl font-extrabold text-secondary'
            }
          >
            {!outletId
              ? 'No outlet linked'
              : dashboardLoading
                ? '—'
                : availablePoints.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="history">My redemptions</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogTab availablePoints={availablePoints} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
