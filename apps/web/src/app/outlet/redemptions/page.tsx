'use client';

import { Building2, Gift } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  RewardRedemption,
  useFulfillRedemption,
  useOutletRedemptions,
} from '@/features/rewards/use-rewards';
import { useMe } from '@/lib/auth';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusVariant(
  status?: string,
): 'success' | 'gold' | 'warning' | 'destructive' | 'outline' {
  if (status === 'FULFILLED') return 'success';
  if (status === 'APPROVED') return 'gold';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  return 'outline';
}

function customerName(r: RewardRedemption) {
  const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ');
  return name || r.user?.id || '—';
}

export default function OutletRedemptionsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOutletRedemptions(page);
  const fulfill = useFulfillRedemption();

  if (!meLoading && !outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Redemptions" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No outlet linked"
          description="Your account is not associated with an outlet yet."
        />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redemptions"
        description="Rewards customers chose to collect at your outlet. Fulfill approved redemptions when the customer picks them up."
      />

      <Card>
        <CardContent className="pt-6">
          {!isLoading && items.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-10 w-10" />}
              title="No redemptions yet"
              description="Reward redemptions with your outlet as the collection point will appear here."
            />
          ) : (
            <DataTable
              isLoading={isLoading}
              rows={items}
              page={page}
              totalPages={data?.meta?.totalPages ?? 1}
              onPageChange={setPage}
              columns={[
                {
                  key: 'reward',
                  header: 'Reward',
                  render: (r: RewardRedemption) => r.reward?.name ?? '—',
                },
                {
                  key: 'customer',
                  header: 'Customer',
                  render: (r: RewardRedemption) => customerName(r),
                },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r: RewardRedemption) =>
                    (r.pointsSpent ?? 0).toLocaleString(),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r: RewardRedemption) => (
                    <Badge
                      variant={statusVariant(r.status)}
                      className="capitalize"
                    >
                      {r.status?.toLowerCase() ?? '—'}
                    </Badge>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Requested',
                  render: (r: RewardRedemption) => formatDate(r.createdAt),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r: RewardRedemption) => (
                    <div className="flex justify-end">
                      {r.status === 'APPROVED' && (
                        <Button
                          variant="gold"
                          size="sm"
                          disabled={fulfill.isPending}
                          onClick={() => fulfill.mutate(r.id)}
                        >
                          Fulfill
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
