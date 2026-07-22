'use client';

import { useState } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/features/leaderboard/leaderboard-table';
import {
  useOutletCustomerLeaderboard,
  useOutletLeaderboard,
} from '@/features/leaderboard/use-leaderboard';
import { useMe } from '@/lib/auth';

function MyCustomersPanel({ outletId }: { outletId?: string }) {
  const [period, setPeriod] = useState<'monthly' | 'lifetime'>('monthly');
  const { data, isLoading } = useOutletCustomerLeaderboard(outletId, period);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top customers at your outlet</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="monthly">This month</TabsTrigger>
            <TabsTrigger value="lifetime">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <LeaderboardTable entries={data ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

function OutletRankingPanel({
  scope,
  regionId,
  outletId,
}: {
  scope: 'national' | 'regional';
  regionId?: string;
  outletId?: string;
}) {
  const { data, isLoading } = useOutletLeaderboard(scope, regionId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {scope === 'national' ? 'National outlet ranking' : 'Regional outlet ranking'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LeaderboardTable
          entries={data ?? []}
          isLoading={isLoading}
          showAvatar={false}
          highlightId={outletId}
        />
      </CardContent>
    </Card>
  );
}

export default function OutletLeaderboardPage() {
  const { data: me } = useMe();
  const outletId = me?.outletId ?? undefined;
  const regionId = me?.regionId ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="See how your customers and your outlet are ranking."
      />
      <Tabs defaultValue="my-customers">
        <TabsList>
          <TabsTrigger value="my-customers">My Customers</TabsTrigger>
          <TabsTrigger value="national">National Outlets</TabsTrigger>
          <TabsTrigger value="regional">Regional Outlets</TabsTrigger>
        </TabsList>
        <TabsContent value="my-customers">
          <MyCustomersPanel outletId={outletId} />
        </TabsContent>
        <TabsContent value="national">
          <OutletRankingPanel scope="national" outletId={outletId} />
        </TabsContent>
        <TabsContent value="regional">
          <OutletRankingPanel scope="regional" regionId={regionId} outletId={outletId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
