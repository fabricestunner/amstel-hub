'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { useTransactions } from '@/features/loyalty/use-loyalty';

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function CustomerHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions(page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points history"
        description="A complete record of your earned and redeemed points."
      />
      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={data?.items ?? []}
            page={page}
            totalPages={data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
            columns={[
              {
                key: 'description',
                header: 'Description',
                render: (r) => r.description ?? r.source ?? '—',
              },
              {
                key: 'type',
                header: 'Type',
                render: (r) => (
                  <Badge variant={r.type === 'redeem' ? 'secondary' : 'success'}>
                    {r.type ?? 'earn'}
                  </Badge>
                ),
              },
              {
                key: 'points',
                header: 'Points',
                render: (r) => (
                  <span
                    className={
                      r.points < 0 ? 'text-destructive' : 'text-emerald-600'
                    }
                  >
                    {r.points > 0 ? '+' : ''}
                    {r.points.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'balance',
                header: 'Balance',
                render: (r) =>
                  r.balance != null ? r.balance.toLocaleString() : '—',
              },
              {
                key: 'createdAt',
                header: 'Date',
                render: (r) => formatDate(r.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
