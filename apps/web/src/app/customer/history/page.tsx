'use client';

import { AlertCircle } from 'lucide-react';
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
  const { data, isLoading, isError, error, refetch } = useTransactions(page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points history"
        description="A complete record of your earned and redeemed points."
      />
      {isError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <p>
              {(error as Error)?.message ??
                'We could not load your points history.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              isLoading={isLoading}
              rows={data?.items ?? []}
              getRowKey={(r) => r.id}
              page={page}
              totalPages={data?.meta?.totalPages ?? 1}
              onPageChange={setPage}
              emptyTitle="No transactions yet"
              emptyDescription="Redeem a code to start earning points. Your activity will show up here."
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
                    <Badge
                      variant={r.type === 'redeem' ? 'secondary' : 'success'}
                    >
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
                        r.points < 0
                          ? 'font-medium text-destructive'
                          : 'font-medium text-green-600 dark:text-green-400'
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
      )}
    </div>
  );
}
