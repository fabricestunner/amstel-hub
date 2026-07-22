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
import {
  useCustomerLeaderboard,
  useOutletLeaderboard,
} from '@/features/leaderboard/use-leaderboard';

function CustomerPanel() {
  const { data, isLoading } = useCustomerLeaderboard('lifetime');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top customers</CardTitle>
      </CardHeader>
      <CardContent>
        <LeaderboardTable entries={data ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

function OutletPanel() {
  const { data, isLoading } = useOutletLeaderboard('national');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top outlets</CardTitle>
      </CardHeader>
      <CardContent>
        <LeaderboardTable
          entries={data ?? []}
          isLoading={isLoading}
          showAvatar={false}
        />
      </CardContent>
    </Card>
  );
}

export default function AdminLeaderboardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboards"
        description="Top performing customers and outlets."
      />
      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <CustomerPanel />
        </TabsContent>
        <TabsContent value="outlets">
          <OutletPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
