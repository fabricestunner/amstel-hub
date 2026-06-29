'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Campaign,
  useCampaigns,
  useCreateCampaign,
  useGenerateCodes,
  useUpdateCampaignStatus,
} from '@/features/campaigns/use-campaigns';

const campaignSchema = z.object({
  name: z.string().min(2, 'Required'),
  description: z.string().optional(),
  pointsPerCode: z.coerce.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

function statusVariant(status?: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'ended':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function AdminCampaignsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCampaigns(page);
  const create = useCreateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const generate = useGenerateCodes();

  const [createOpen, setCreateOpen] = useState(false);
  const [codesFor, setCodesFor] = useState<Campaign | null>(null);
  const [count, setCount] = useState(100);
  const [codeType, setCodeType] = useState('PROMO');
  const [generated, setGenerated] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignForm>({ resolver: zodResolver(campaignSchema) });

  function onCreate(values: CampaignForm) {
    create.mutate(values, {
      onSuccess: () => {
        setCreateOpen(false);
        reset();
      },
    });
  }

  function onGenerate() {
    if (!codesFor) return;
    generate.mutate(
      { id: codesFor.id, count, type: codeType },
      {
        onSuccess: (res) => {
          setGenerated(res.codes ?? []);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Create campaigns and generate redemption codes."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
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
              { key: 'name', header: 'Name' },
              {
                key: 'status',
                header: 'Status',
                render: (r: Campaign) => (
                  <Badge variant={statusVariant(r.status)} className="capitalize">
                    {r.status ?? 'draft'}
                  </Badge>
                ),
              },
              {
                key: 'pointsPerCode',
                header: 'Points / code',
                render: (r: Campaign) => (r.pointsPerCode ?? 0).toLocaleString(),
              },
              {
                key: 'codesGenerated',
                header: 'Codes',
                render: (r: Campaign) =>
                  `${(r.codesRedeemed ?? 0).toLocaleString()} / ${(r.codesGenerated ?? 0).toLocaleString()}`,
              },
              {
                key: 'actions',
                header: '',
                render: (r: Campaign) => (
                  <div className="flex justify-end gap-2">
                    {r.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: r.id, status: 'paused' })
                        }
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: r.id, status: 'active' })
                        }
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => {
                        setCodesFor(r);
                        setGenerated([]);
                      }}
                    >
                      <QrCode className="h-4 w-4" /> Codes
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create campaign dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle>New campaign</DialogTitle>
              <DialogDescription>
                Set up a new code-based loyalty campaign.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pointsPerCode">Points per code</Label>
                  <Input
                    id="pointsPerCode"
                    type="number"
                    {...register('pointsPerCode')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" type="date" {...register('endDate')} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate codes dialog */}
      <Dialog open={!!codesFor} onOpenChange={(o) => !o && setCodesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate codes</DialogTitle>
            <DialogDescription>
              {codesFor?.name} — create new redemption codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="count">Count</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={codeType} onValueChange={setCodeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROMO">Promo voucher</SelectItem>
                    <SelectItem value="QR">QR code</SelectItem>
                    <SelectItem value="BOTTLE">Bottle cap</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {generated.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3">
                <p className="mb-2 text-sm font-medium">
                  {generated.length} codes generated
                </p>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                  {generated.map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodesFor(null)}>
              Close
            </Button>
            <Button
              variant="gold"
              disabled={generate.isPending || count < 1}
              onClick={onGenerate}
            >
              {generate.isPending ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
