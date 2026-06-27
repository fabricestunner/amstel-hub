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

import { AreaChartCard } from '@/components/charts/area-chart-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useOutletDashboard } from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
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
    <div className="space-y-8">
      <PageHeader
        title={data?.name ?? 'Outlet dashboard'}
        description="Your outlet's performance and recent activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <CardTitle>Recent customers</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={isLoading}
            rows={data?.recentCustomers ?? []}
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
