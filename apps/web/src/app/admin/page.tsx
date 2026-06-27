'use client';

import { Coins, Gift, TrendingDown, Users } from 'lucide-react';

import { AreaChartCard } from '@/components/charts/area-chart-card';
import { BarChartCard } from '@/components/charts/bar-chart-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  useAnalyticsOverview,
  useAnalyticsTrends,
} from '@/features/analytics/use-analytics';

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = useAnalyticsOverview();
  const { data: trends } = useAnalyticsTrends('30d');

  const stat = (v?: number) => (isLoading ? '—' : (v ?? 0).toLocaleString());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Platform-wide loyalty performance at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active users"
          value={stat(overview?.activeUsers)}
          delta={overview?.activeUsersDelta}
          deltaLabel="vs last month"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Points issued"
          value={stat(overview?.pointsIssued)}
          delta={overview?.pointsIssuedDelta}
          deltaLabel="vs last month"
          icon={<Coins className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="Points redeemed"
          value={stat(overview?.pointsRedeemed)}
          delta={overview?.pointsRedeemedDelta}
          deltaLabel="vs last month"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          title="Reward redemptions"
          value={stat(overview?.rewardRedemptions)}
          delta={overview?.rewardRedemptionsDelta}
          deltaLabel="vs last month"
          icon={<Gift className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AreaChartCard
          title="Registrations (30d)"
          data={trends?.registrations ?? []}
        />
        <AreaChartCard
          title="Points issued (30d)"
          data={trends?.pointsIssued ?? []}
          color="hsl(var(--secondary))"
        />
      </div>

      <BarChartCard
        title="Top regions by points"
        data={overview?.topRegions ?? []}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top outlets</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              isLoading={isLoading}
              rows={overview?.topOutlets ?? []}
              columns={[
                { key: 'name', header: 'Outlet' },
                { key: 'region', header: 'Region', render: (r) => r.region ?? '—' },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r) => (r.points ?? 0).toLocaleString(),
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              isLoading={isLoading}
              rows={overview?.topCustomers ?? []}
              columns={[
                { key: 'name', header: 'Customer' },
                { key: 'region', header: 'Region', render: (r) => r.region ?? '—' },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r) => (r.points ?? 0).toLocaleString(),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
