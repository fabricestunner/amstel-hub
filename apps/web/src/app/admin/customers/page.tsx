'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { UserRow, useUsers } from '@/features/users/use-users';

function name(r: UserRow) {
  return (
    r.fullName ||
    [r.firstName, r.lastName].filter(Boolean).join(' ') ||
    r.email ||
    '—'
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsers({ page, search });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Search and review registered users."
      />
      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={data?.items ?? []}
            searchValue={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            page={page}
            totalPages={data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
            columns={[
              { key: 'name', header: 'Name', render: (r: UserRow) => name(r) },
              {
                key: 'email',
                header: 'Email',
                render: (r: UserRow) => r.email ?? '—',
              },
              {
                key: 'role',
                header: 'Role',
                render: (r: UserRow) => (
                  <Badge variant="outline" className="capitalize">
                    {r.role ?? 'customer'}
                  </Badge>
                ),
              },
              {
                key: 'points',
                header: 'Points',
                render: (r: UserRow) => (r.points ?? 0).toLocaleString(),
              },
              {
                key: 'createdAt',
                header: 'Joined',
                render: (r: UserRow) => formatDate(r.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
