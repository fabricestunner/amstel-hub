'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AuditLogRow,
  FraudFlagRow,
  useAuditLogs,
  useFraudFlags,
  useResolveFlag,
} from '@/features/audit/use-audit';
import { useMe } from '@/lib/auth';

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function actorName(a: AuditLogRow['actor']) {
  if (!a) return 'System';
  return [a.firstName, a.lastName].filter(Boolean).join(' ') || a.id.slice(0, 8);
}

function severityVariant(severity: string) {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive' as const;
    case 'MEDIUM':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

function fraudStatusVariant(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return 'destructive' as const;
    case 'DISMISSED':
      return 'secondary' as const;
    case 'REVIEWING':
      return 'warning' as const;
    default:
      return 'outline' as const;
  }
}

export default function AdminAuditPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Fraud"
        description="Review administrative actions and flagged suspicious activity."
      />

      <Tabs defaultValue="fraud">
        <TabsList>
          <TabsTrigger value="fraud">Fraud flags</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>

        <TabsContent value="fraud" className="mt-4">
          <FraudFlagsTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="audit" className="mt-4">
            <AuditLogTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function FraudFlagsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const { data, isLoading } = useFraudFlags({ page, status });
  const resolve = useResolveFlag();

  return (
    <div className="space-y-4">
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="REVIEWING">Reviewing</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="DISMISSED">Dismissed</SelectItem>
        </SelectContent>
      </Select>

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
                key: 'type',
                header: 'Type',
                render: (r: FraudFlagRow) => (
                  <span className="font-medium">{r.type}</span>
                ),
              },
              {
                key: 'severity',
                header: 'Severity',
                render: (r: FraudFlagRow) => (
                  <Badge variant={severityVariant(r.severity)} className="capitalize">
                    {r.severity.toLowerCase()}
                  </Badge>
                ),
              },
              {
                key: 'user',
                header: 'User',
                render: (r: FraudFlagRow) =>
                  r.user
                    ? [r.user.firstName, r.user.lastName]
                        .filter(Boolean)
                        .join(' ') ||
                      r.user.phone ||
                      '—'
                    : '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: FraudFlagRow) => (
                  <Badge variant={fraudStatusVariant(r.status)} className="capitalize">
                    {r.status.toLowerCase()}
                  </Badge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Flagged',
                render: (r: FraudFlagRow) => formatDateTime(r.createdAt),
              },
              {
                key: 'actions',
                header: '',
                render: (r: FraudFlagRow) =>
                  r.status === 'OPEN' || r.status === 'REVIEWING' ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolve.isPending}
                        onClick={() =>
                          resolve.mutate({ id: r.id, status: 'DISMISSED' })
                        }
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={resolve.isPending}
                        onClick={() =>
                          resolve.mutate({ id: r.id, status: 'CONFIRMED' })
                        }
                      >
                        Confirm
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAuditLogs({ page, search });

  return (
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
            {
              key: 'action',
              header: 'Action',
              render: (r: AuditLogRow) => (
                <span className="font-mono text-xs font-medium">{r.action}</span>
              ),
            },
            {
              key: 'entityType',
              header: 'Entity',
              render: (r: AuditLogRow) => (
                <span className="text-sm">
                  {r.entityType}
                  {r.entityId ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {r.entityId.slice(0, 8)}
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: 'actor',
              header: 'Actor',
              render: (r: AuditLogRow) => actorName(r.actor),
            },
            {
              key: 'ipAddress',
              header: 'IP',
              render: (r: AuditLogRow) => r.ipAddress ?? '—',
            },
            {
              key: 'createdAt',
              header: 'When',
              render: (r: AuditLogRow) => formatDateTime(r.createdAt),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
