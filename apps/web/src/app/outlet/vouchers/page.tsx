'use client';

import { Building2, CheckCircle2, Ticket, TicketCheck } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  useOutletVouchers,
  type OutletVoucher,
} from '@/features/outlets/use-outlets';
import { useMe } from '@/lib/auth';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function statusVariant(
  status: string,
): 'success' | 'gold' | 'warning' | 'destructive' | 'outline' {
  if (status === 'REDEEMED') return 'gold';
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRED') return 'warning';
  if (status === 'REVOKED') return 'destructive';
  return 'outline';
}

export default function OutletVouchersPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const outletId = me?.outletId ?? undefined;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOutletVouchers(outletId, page);

  if (!meLoading && !outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vouchers" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No outlet linked"
          description="Your account is not associated with an outlet yet."
        />
      </div>
    );
  }

  const counts = data?.counts;
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        description="Codes generated for your outlet, and whether they've been scanned."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total vouchers"
          value={isLoading ? '—' : (counts?.total ?? 0).toLocaleString()}
          icon={<Ticket className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="Active"
          value={isLoading ? '—' : (counts?.active ?? 0).toLocaleString()}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Scanned"
          value={isLoading ? '—' : (counts?.redeemed ?? 0).toLocaleString()}
          icon={<TicketCheck className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!isLoading && items.length === 0 ? (
            <EmptyState
              icon={<Ticket className="h-10 w-10" />}
              title="No vouchers yet"
              description="Vouchers generated for your outlet will appear here. Ask an administrator to link a batch to your outlet."
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
                  key: 'reference',
                  header: 'Voucher',
                  render: (r: OutletVoucher) => (
                    <span className="font-mono text-xs font-semibold tracking-wider">
                      {r.reference}
                    </span>
                  ),
                },
                {
                  key: 'campaign',
                  header: 'Campaign',
                  render: (r: OutletVoucher) => r.campaign ?? '—',
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (r: OutletVoucher) => (
                    <Badge variant="outline" className="capitalize">
                      {r.type?.toLowerCase() ?? '—'}
                    </Badge>
                  ),
                },
                {
                  key: 'points',
                  header: 'Points',
                  render: (r: OutletVoucher) => r.points.toLocaleString(),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r: OutletVoucher) => (
                    <Badge variant={statusVariant(r.status)} className="capitalize">
                      {r.status === 'REDEEMED'
                        ? 'scanned'
                        : r.status?.toLowerCase() ?? '—'}
                    </Badge>
                  ),
                },
                {
                  key: 'redeemedBy',
                  header: 'Scanned by',
                  render: (r: OutletVoucher) => r.redeemedBy ?? '—',
                },
                {
                  key: 'createdAt',
                  header: 'Generated',
                  render: (r: OutletVoucher) => formatDateTime(r.createdAt),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
