'use client';

import { Ban, CheckCircle2, Clock, Layers, MoreHorizontal, Ticket } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { useCampaigns } from '@/features/campaigns/use-campaigns';
import { useOutlets } from '@/features/outlets/use-outlets';
import {
  useVoidBatch,
  useVoidVoucher,
  useVouchers,
  type Voucher,
} from '@/features/vouchers/use-vouchers';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusVariant(status: Voucher['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'success' as const;
    case 'REDEEMED':
      return 'secondary' as const;
    case 'EXPIRED':
      return 'warning' as const;
    case 'VOID':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

export function VoucherArchive() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [voidTarget, setVoidTarget] = useState<Voucher | null>(null);
  const [batchTarget, setBatchTarget] = useState<Voucher | null>(null);

  const { data, isLoading } = useVouchers({
    page,
    search,
    status: statusFilter,
    campaignId: campaignFilter,
    outletId: outletFilter,
  });

  const { data: campaignsData } = useCampaigns(1);
  const campaigns = campaignsData?.items ?? [];

  const { data: outletsData } = useOutlets({ page: 1 });
  const outlets = Array.isArray(outletsData)
    ? outletsData
    : (outletsData?.items ?? []);

  const voidVoucher = useVoidVoucher();
  const voidBatch = useVoidBatch();

  const rows = data?.items ?? [];
  const counts = data?.counts;

  function onVoid() {
    if (!voidTarget) return;
    voidVoucher.mutate(voidTarget.id, { onSuccess: () => setVoidTarget(null) });
  }

  function onVoidBatch() {
    if (!batchTarget?.batchId) return;
    voidBatch.mutate(batchTarget.batchId, {
      onSuccess: () => setBatchTarget(null),
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total" value={(counts?.total ?? 0).toLocaleString()} icon={<Ticket />} />
        <StatCard
          title="Active"
          value={(counts?.active ?? 0).toLocaleString()}
          icon={<CheckCircle2 />}
          accent="gold"
        />
        <StatCard
          title="Redeemed"
          value={(counts?.redeemed ?? 0).toLocaleString()}
          icon={<CheckCircle2 />}
        />
        <StatCard
          title="Expired"
          value={(counts?.expired ?? 0).toLocaleString()}
          icon={<Clock />}
          accent="gold"
        />
        <StatCard
          title="Voided"
          value={(counts?.void ?? 0).toLocaleString()}
          icon={<Ban />}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={campaignFilter}
          onValueChange={(v) => { setCampaignFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={outletFilter}
          onValueChange={(v) => { setOutletFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All outlets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outlets</SelectItem>
            {outlets.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="REDEEMED">Redeemed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={rows}
            getRowKey={(r: Voucher) => r.id}
            searchValue={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Search by reference..."
            page={page}
            totalPages={data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
            emptyTitle="No vouchers"
            emptyDescription="Generate vouchers or adjust your filters."
            columns={[
              {
                key: 'reference',
                header: 'Reference',
                render: (r: Voucher) => (
                  <span className="font-mono text-sm font-medium">{r.reference}</span>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (r: Voucher) => (
                  <Badge variant="outline" className="capitalize">
                    {r.type.toLowerCase()}
                  </Badge>
                ),
              },
              {
                key: 'points',
                header: 'Points',
                render: (r: Voucher) => r.points.toLocaleString(),
              },
              {
                key: 'campaign',
                header: 'Campaign',
                render: (r: Voucher) => r.campaign ?? '—',
              },
              {
                key: 'outlet',
                header: 'Outlet',
                render: (r: Voucher) => r.outlet ?? '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: Voucher) => (
                  <Badge variant={statusVariant(r.status)} className="capitalize">
                    {r.status.toLowerCase()}
                  </Badge>
                ),
              },
              {
                key: 'redeemed',
                header: 'Redeemed',
                render: (r: Voucher) =>
                  r.redeemedBy || r.redeemedAt ? (
                    <div className="text-sm leading-tight">
                      <div className="font-medium">{r.redeemedBy ?? '—'}</div>
                      <div className="text-muted-foreground">{formatDate(r.redeemedAt)}</div>
                    </div>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'createdAt',
                header: 'Created',
                render: (r: Voucher) => formatDate(r.createdAt),
              },
              {
                key: 'actions',
                header: '',
                render: (r: Voucher) => {
                  const isRedeemed = r.status === 'REDEEMED';
                  return (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuLabel>Manage</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* The API rejects voiding a redeemed voucher with a 409,
                              so surface the reason instead of letting it fail. */}
                          <DropdownMenuItem
                            disabled={isRedeemed}
                            className={isRedeemed ? undefined : 'text-destructive focus:text-destructive'}
                            onClick={() => setVoidTarget(r)}
                          >
                            <Ban className="mr-2 h-4 w-4" /> Void voucher
                          </DropdownMenuItem>
                          {isRedeemed && (
                            <p className="px-2 pb-1.5 pl-8 text-xs text-muted-foreground">
                              Already redeemed — it can no longer be voided.
                            </p>
                          )}

                          {r.batchId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setBatchTarget(r)}
                              >
                                <Layers className="mr-2 h-4 w-4" /> Void entire batch
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                },
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* ── Void voucher confirmation ── */}
      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void voucher?</DialogTitle>
            <DialogDescription>
              <strong>{voidTarget?.reference}</strong> can no longer be redeemed once
              voided. This cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidVoucher.isPending}
              onClick={onVoid}
            >
              {voidVoucher.isPending ? 'Voiding…' : 'Void voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Void batch confirmation ── */}
      <Dialog open={!!batchTarget} onOpenChange={(o) => !o && setBatchTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void entire batch?</DialogTitle>
            <DialogDescription>
              Every unused code in batch{' '}
              <strong className="font-mono">{batchTarget?.batchId}</strong> will be
              voided and can never be redeemed. Vouchers that customers have already
              redeemed are skipped. This cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidBatch.isPending}
              onClick={onVoidBatch}
            >
              {voidBatch.isPending ? 'Voiding…' : 'Void batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
