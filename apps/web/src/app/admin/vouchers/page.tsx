'use client';

import { Printer, RefreshCw, Ticket } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCampaigns, useGenerateCodes, type GenerateCodesResult } from '@/features/campaigns/use-campaigns';

interface GeneratedVoucher {
  code: string;
  index: number;
}

export default function AdminVouchersPage() {
  const [campaignId, setCampaignId] = useState('');
  const [count, setCount] = useState(50);
  const [type, setType] = useState('PROMO');
  const [vouchers, setVouchers] = useState<GeneratedVoucher[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: campaignsData } = useCampaigns(1);
  const campaigns = campaignsData?.items ?? [];

  const generate = useGenerateCodes();

  function onGenerate() {
    if (!campaignId) return;
    const selected = campaigns.find((c) => c.id === campaignId);
    generate.mutate(
      { id: campaignId, count, type },
      {
        onSuccess: (res: GenerateCodesResult) => {
          setVouchers((res.codes ?? []).map((code, i) => ({ code, index: i + 1 })));
          setCampaignName(selected?.name ?? 'Campaign');
        },
      },
    );
  }

  function onPrint() {
    window.print();
  }

  return (
    <>
      {/* Print styles injected globally */}
      <style>{`
        @media print {
          body > *:not(#voucher-print-root) { display: none !important; }
          #voucher-print-root { display: block !important; }
          .no-print { display: none !important; }
          .voucher-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            padding: 8px !important;
          }
          .voucher-card {
            break-inside: avoid;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            padding: 12px !important;
            page-break-inside: avoid !important;
          }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>

      <div className="no-print space-y-6">
        <PageHeader
          title="Promo Vouchers"
          description="Generate and print promo codes to distribute at outlets."
          actions={
            vouchers.length > 0 ? (
              <Button onClick={onPrint} variant="outline">
                <Printer className="h-4 w-4" /> Print vouchers
              </Button>
            ) : null
          }
        />

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Generate vouchers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign…" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.status && (
                        <span className="ml-2 text-xs capitalize text-muted-foreground">
                          ({c.status})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="count">Quantity</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Max 500 per batch</p>
              </div>
              <div className="space-y-2">
                <Label>Voucher type</Label>
                <Select value={type} onValueChange={setType}>
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

            <Button
              className="w-full"
              disabled={!campaignId || count < 1 || generate.isPending}
              onClick={onGenerate}
            >
              {generate.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4" /> Generate {count} voucher{count !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {vouchers.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{campaignName}</h2>
                <p className="text-sm text-muted-foreground">
                  {vouchers.length} vouchers ready — click Print to get the sheet
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="gold">{type}</Badge>
                <Button onClick={onPrint}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {vouchers.map((v) => (
                <VoucherCard key={v.code} voucher={v} campaignName={campaignName} type={type} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Print-only root — hidden on screen, visible when printing */}
      <div id="voucher-print-root" style={{ display: 'none' }} ref={printRef}>
        {vouchers.length > 0 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16, padding: '8px 0', borderBottom: '2px solid #C8102E' }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#C8102E', margin: 0 }}>
                AMSTEL REWARDS — {campaignName.toUpperCase()}
              </h1>
              <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>
                {vouchers.length} promo vouchers · {type} type · Scan QR or enter code to earn points
              </p>
            </div>
            <div className="voucher-grid">
              {vouchers.map((v) => (
                <PrintVoucherCard key={v.code} voucher={v} campaignName={campaignName} type={type} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function VoucherCard({ voucher, campaignName, type }: { voucher: GeneratedVoucher; campaignName: string; type: string }) {
  return (
    <div className="voucher-card flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center shadow-sm">
      <div className="flex w-full items-center justify-between">
        <Image src="/amstel-logo.jpg" alt="Amstel" width={32} height={32} className="rounded-full" />
        <Badge variant="gold" className="text-xs capitalize">{type}</Badge>
      </div>
      <div className="rounded-lg bg-white p-2">
        <QRCode value={voucher.code} size={96} />
      </div>
      <div>
        <p className="font-mono text-sm font-bold tracking-wider">{voucher.code}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{campaignName}</p>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Scan or enter code at amstelhub.pristinetech.co.rw
      </p>
    </div>
  );
}

function PrintVoucherCard({ voucher, campaignName, type }: { voucher: GeneratedVoucher; campaignName: string; type: string }) {
  return (
    <div
      className="voucher-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#C8102E' }}>AMSTEL REWARDS</span>
        <span style={{ fontSize: 9, background: '#D4A017', color: '#fff', borderRadius: 4, padding: '1px 5px', textTransform: 'capitalize' }}>
          {type}
        </span>
      </div>
      <div style={{ background: '#fff', padding: 6, borderRadius: 6 }}>
        <QRCode value={voucher.code} size={80} />
      </div>
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
          {voucher.code}
        </div>
        <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{campaignName}</div>
      </div>
      <div style={{ fontSize: 8, color: '#aaa' }}>amstelhub.pristinetech.co.rw</div>
    </div>
  );
}
