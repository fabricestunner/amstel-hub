'use client';

import { Building2, History, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  useOutletDashboard,
  useOutletRedemptions,
} from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function OutletCustomersPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const { data, isLoading } = useOutletDashboard(outletId);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const { data: redemptions, isLoading: redemptionsLoading } =
    useOutletRedemptions(outletId, redemptionsPage);

  if (!meLoading && !outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customers" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No outlet linked"
          description="Your account is not associated with an outlet yet."
        />
      </div>
    );
  }

  const customers = data?.recentCustomers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customers registered through your outlet."
      />
      <Card>
        <CardContent className="pt-6">
          {!isLoading && customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No customers yet"
              description="Registered customers will appear here."
            />
          ) : (
            <DataTable
              isLoading={isLoading}
              rows={customers}
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-amstel-gold" />
            Redemption history
          </CardTitle>
          <CardDescription>
            Every code your customers redeemed at this outlet, with points earned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!redemptionsLoading && (redemptions?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<History className="h-10 w-10" />}
              title="No redemptions yet"
              description="Customer code redemptions at your outlet will appear here."
            />
          ) : (
            <DataTable
              isLoading={redemptionsLoading}
              rows={redemptions?.items ?? []}
              page={redemptionsPage}
              totalPages={redemptions?.meta?.totalPages ?? 1}
              onPageChange={setRedemptionsPage}
              columns={[
                {
                  key: 'customerName',
                  header: 'Customer',
                  render: (r) => r.customerName ?? '—',
                },
                {
                  key: 'campaign',
                  header: 'Campaign',
                  render: (r) => r.campaign ?? '—',
                },
                {
                  key: 'codeType',
                  header: 'Type',
                  render: (r) => (
                    <Badge variant="outline" className="capitalize">
                      {r.codeType?.toLowerCase() ?? '—'}
                    </Badge>
                  ),
                },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r) => (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      +{r.points.toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'redeemedAt',
                  header: 'Redeemed at',
                  render: (r) => formatDateTime(r.redeemedAt),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
