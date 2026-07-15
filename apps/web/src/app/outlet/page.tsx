'use client';

import {
  Award,
  Building2,
  Coins,
  Gift,
  MapPin,
  Trophy,
  UserPlus,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useOutletDashboard } from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';

// Charts pull in Recharts (a large client-only bundle). Load it lazily so the
// dashboard shell and stat cards paint immediately.
const AreaChartCard = dynamic(
  () =>
    import('@/components/charts/area-chart-card').then((m) => m.AreaChartCard),
  {
    ssr: false,
    loading: () => (
      <Card>
        <div className="space-y-4 p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </Card>
    ),
  },
);

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusBadge(status?: string) {
  const s = status?.toUpperCase?.() ?? status ?? '';
  if (s === 'FULFILLED') {
    return <Badge variant="success">Fulfilled</Badge>;
  }
  if (s === 'APPROVED') {
    return <Badge variant="warning">Approved</Badge>;
  }
  if (s === 'PENDING') {
    return <Badge variant="secondary">Pending</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

export default function OutletDashboardPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const { data, isLoading } = useOutletDashboard(outletId);

  if (!meLoading && !outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Outlet dashboard" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No outlet linked"
          description="Your account is not associated with an outlet yet. Contact an administrator."
        />
      </div>
    );
  }

  const stat = (v?: number) => (isLoading ? '—' : (v ?? 0).toLocaleString());

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.name ?? 'Outlet dashboard'}
        description="Your outlet's performance and recent activity."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="National rank"
          value={data?.nationalRank ? `#${data.nationalRank}` : '—'}
          icon={<Award className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="Regional rank"
          value={data?.regionalRank ? `#${data.regionalRank}` : '—'}
          icon={<MapPin className="h-5 w-5" />}
        />
        <StatCard
          title="Campaign sales"
          value={stat(data?.campaignSales)}
          icon={<Coins className="h-5 w-5" />}
        />
        <StatCard
          title="Points generated"
          value={stat(data?.pointsGenerated)}
          icon={<Coins className="h-5 w-5" />}
        />
        <StatCard
          title="Customers registered"
          value={stat(data?.customersRegistered)}
          icon={<UserPlus className="h-5 w-5" />}
        />
        <StatCard
          title="Rewards earned"
          value={stat(data?.rewardsEarned)}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          title="Points redeemed"
          value={stat(data?.pointsRedeemed)}
          icon={<Gift className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaChartCard
            title="Points generated over time"
            data={data?.pointsTrend ?? []}
            color="hsl(var(--secondary))"
          />
        </div>
        <Card className="border-secondary/40 bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Tournament entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-secondary">
              {stat(data?.tournamentEntries)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Customers entered via your outlet.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign performance</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={isLoading}
            rows={data?.campaignPerformance ?? []}
            emptyTitle="No campaign sales yet"
            emptyDescription="Codes scanned at your outlet will be summarised per campaign here."
            columns={[
              { key: 'campaign', header: 'Campaign' },
              {
                key: 'redemptions',
                header: 'Scans',
                render: (r) => (r.redemptions ?? 0).toLocaleString(),
              },
              {
                key: 'points',
                header: 'Points generated',
                render: (r) => (r.points ?? 0).toLocaleString(),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-secondary" />
            Recent reward redemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={isLoading}
            rows={data?.recentRewards ?? []}
            emptyTitle="No reward redemptions yet"
            emptyDescription="Rewards collected at your outlet will appear here."
            columns={[
              { key: 'rewardName', header: 'Reward' },
              { key: 'customerName', header: 'Customer' },
              {
                key: 'pointsSpent',
                header: 'Points spent',
                render: (r) => (r.pointsSpent ?? 0).toLocaleString(),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => statusBadge(r.status),
              },
              {
                key: 'createdAt',
                header: 'Redeemed',
                render: (r) => formatDate(r.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent customers</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={isLoading}
            rows={data?.recentCustomers ?? []}
            emptyTitle="No customers yet"
            emptyDescription="Registered customers will appear here."
            columns={[
              { key: 'name', header: 'Name' },
              {
                key: 'points',
                header: 'Points',
                render: (r) => (r.points ?? 0).toLocaleString(),
              },
              {
                key: 'joinedAt',
                header: 'Joined',
                render: (r) => formatDate(r.joinedAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
