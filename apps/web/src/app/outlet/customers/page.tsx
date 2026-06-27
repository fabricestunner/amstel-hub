'use client';

import { Building2, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useOutletDashboard } from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function OutletCustomersPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const { data, isLoading } = useOutletDashboard(outletId);

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
    </div>
  );
}
