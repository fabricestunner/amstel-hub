'use client';

import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Gift,
  Loader2,
  QrCode,
  ScanLine,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useTransactions } from '@/features/loyalty/use-loyalty';
import { type RedeemResult, useRedeemCode, useWallet } from '@/features/wallet/use-wallet';
import { useMe } from '@/lib/auth';

// Camera QR scanner pulls in the html5-qrcode library; load it only on the
// client and split it out of the initial page bundle.
const QrScannerDialog = dynamic(
  () =>
    import('@/features/wallet/qr-scanner-dialog').then(
      (m) => m.QrScannerDialog,
    ),
  { ssr: false },
);

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function CustomerDashboard() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: me } = useMe();
  const { data: txns, isLoading: txnsLoading } = useTransactions(1);
  const redeem = useRedeemCode();
  const [code, setCode] = useState('');
  const [lastResult, setLastResult] = useState<RedeemResult | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const transactions = txns?.items ?? [];

  function submitCode(raw: string) {
    const value = raw.trim().toUpperCase();
    if (!value || redeem.isPending) return;
    setCode(value);
    redeem.mutate(value, {
      onSuccess: (res) => {
        setLastResult(res);
        setCode('');
      },
    });
  }

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    submitCode(code);
  }

  function handleScan(value: string) {
    submitCode(value);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${me?.firstName ? `, ${me.firstName}` : ''}`}
        description="Scan Amstel codes to earn points and claim rewards."
      />

      {/* Points summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available points"
          value={walletLoading ? '—' : (wallet?.availablePoints ?? 0).toLocaleString()}
          icon={<Coins className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="Codes scanned"
          value={walletLoading ? '—' : (wallet?.codesRedeemed ?? 0).toLocaleString()}
          icon={<QrCode className="h-5 w-5" />}
        />
        <StatCard
          title="Points spent on rewards"
          value={walletLoading ? '—' : (wallet?.redeemedPoints ?? 0).toLocaleString()}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          title="Lifetime points"
          value={walletLoading ? '—' : (wallet?.lifetimePoints ?? 0).toLocaleString()}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="max-w-3xl">
        {/* Success banner */}
        {lastResult && (
          <div className="relative flex items-start gap-4 rounded-xl border border-green-500/30 bg-green-50 p-5 dark:bg-green-900/20">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-700 dark:text-green-400">
                Code scanned successfully!
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-bold text-foreground text-lg">+{lastResult.pointsEarned}</span> points earned
                {lastResult.campaign ? ` from ${lastResult.campaign}` : ''}.
                Your total is now{' '}
                <span className="font-semibold">{lastResult.availablePoints.toLocaleString()} pts</span>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You will receive a confirmation by SMS and email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastResult(null)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amstel-red/40"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <Card className="mt-4 overflow-hidden border-amstel-red/15 shadow-sm">
          <div
            aria-hidden
            className="h-1.5 bg-gradient-to-r from-amstel-red via-amstel-red to-amstel-gold"
          />
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amstel-gold/15 text-amstel-gold">
                <Sparkles className="h-5 w-5" />
              </span>
              Scan a Code
            </CardTitle>
            <CardDescription>
              Scan the QR or type the code from your Amstel bottle, can or
              voucher. Points land in your wallet straight away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleRedeem}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AMSTEL-XXXX-XXXX"
                className="h-12 flex-1 font-mono text-lg tracking-widest focus-visible:ring-amstel-red/40"
                disabled={redeem.isPending}
                autoComplete="off"
                autoCapitalize="characters"
                aria-label="Redemption code"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanOpen(true)}
                  disabled={redeem.isPending}
                  className="h-12 shrink-0 border-amstel-red/30 text-amstel-red hover:bg-amstel-red/5 hover:text-amstel-red"
                >
                  <ScanLine className="h-4 w-4" /> Scan
                </Button>
                <Button
                  type="submit"
                  disabled={!code || redeem.isPending}
                  className="h-12 shrink-0 bg-amstel-red px-6 text-white hover:bg-amstel-red-dark"
                >
                  {redeem.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Entering…
                    </>
                  ) : (
                    'Enter'
                  )}
                </Button>
              </div>
            </form>

            {/* Error display */}
            {redeem.isError && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {(redeem.error as Error)?.message ??
                  'Failed to redeem. Please try again.'}
              </p>
            )}

            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Find the code on your Amstel bottle, can, or promo voucher</li>
                <li>Enter the code above and click Enter</li>
                <li>Points are added instantly to your wallet</li>
                <li>Use points for rewards or tournament entries</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Your latest points transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={txnsLoading}
            columns={[
              {
                key: 'campaign',
                header: 'Campaign',
                render: (r) => r.campaign ?? r.description ?? r.source ?? '—',
              },
              { key: 'outlet', header: 'Outlet', render: (r) => r.outlet ?? '—' },
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
                header: 'Points earned',
                render: (r) => (
                  <span className={r.points < 0 ? 'text-destructive' : 'text-green-600 font-medium dark:text-green-400'}>
                    {r.points > 0 ? '+' : ''}
                    {r.points.toLocaleString()}
                  </span>
                ),
              },
              { key: 'createdAt', header: 'Date & time', render: (r) => formatDate(r.createdAt) },
            ]}
            rows={transactions}
          />
        </CardContent>
      </Card>

      <QrScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={handleScan}
      />
    </div>
  );
}
