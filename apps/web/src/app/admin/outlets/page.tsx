'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Outlet, useOutlets } from '@/features/outlets/use-outlets';

export default function AdminOutletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useOutlets({ page, search, region, status });
  const outlets = useMemo(
    () => (Array.isArray(data) ? data : (data?.items ?? [])),
    [data],
  );
  const totalPages = Array.isArray(data) ? 1 : (data?.meta?.totalPages ?? 1);

  const regions = useMemo(() => {
    const set = new Set<string>();
    outlets.forEach((o) => o.region && set.add(o.region));
    return Array.from(set);
  }, [outlets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outlets"
        description="Browse and filter registered outlets."
      />

      <div className="flex flex-wrap gap-3">
        <Select
          value={region}
          onValueChange={(v) => {
            setRegion(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={outlets}
            searchValue={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            columns={[
              { key: 'name', header: 'Outlet' },
              {
                key: 'region',
                header: 'Region',
                render: (r: Outlet) => r.region ?? '—',
              },
              {
                key: 'customers',
                header: 'Customers',
                render: (r: Outlet) => (r.customers ?? 0).toLocaleString(),
              },
              {
                key: 'pointsGenerated',
                header: 'Points',
                render: (r: Outlet) => (r.pointsGenerated ?? 0).toLocaleString(),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: Outlet) => (
                  <Badge
                    variant={r.status === 'active' ? 'success' : 'secondary'}
                    className="capitalize"
                  >
                    {r.status ?? 'active'}
                  </Badge>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
