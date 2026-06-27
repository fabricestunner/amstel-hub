'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/features/leaderboard/leaderboard-table';
import { useCustomerLeaderboard } from '@/features/leaderboard/use-leaderboard';

function LeaderboardPanel({ period }: { period: 'monthly' | 'lifetime' }) {
  const { data, isLoading } = useCustomerLeaderboard(period);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{period} leaders</CardTitle>
      </CardHeader>
      <CardContent>
        <LeaderboardTable entries={data ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

export default function CustomerLeaderboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="See how you stack up against other Amstel fans."
      />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="lifetime">Lifetime</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <LeaderboardPanel period="monthly" />
        </TabsContent>
        <TabsContent value="lifetime">
          <LeaderboardPanel period="lifetime" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
