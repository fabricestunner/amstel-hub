'use client';

import { CheckCircle2, Coins, Gift, Sparkles, TrendingUp, Trophy, X } from 'lucide-react';
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

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function CustomerDashboard() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: me } = useMe();
  const { data: txns, isLoading: txnsLoading } = useTransactions(1);
  const redeem = useRedeemCode();
  const [code, setCode] = useState('');
  const [lastResult, setLastResult] = useState<RedeemResult | null>(null);

  const transactions = txns?.items ?? [];

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    redeem.mutate(code, {
      onSuccess: (res) => {
        setLastResult(res);
        setCode('');
      },
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${me?.firstName ? `, ${me.firstName}` : ''}`}
        description="Redeem Amstel codes to earn points and unlock rewards."
      />

      {/* Points summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Available points"
          value={walletLoading ? '—' : (wallet?.availablePoints ?? 0).toLocaleString()}
          icon={<Coins className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="Redeemed points"
          value={walletLoading ? '—' : (wallet?.redeemedPoints ?? 0).toLocaleString()}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          title="Lifetime points"
          value={walletLoading ? '—' : (wallet?.lifetimePoints ?? 0).toLocaleString()}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Redemption card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Success banner */}
          {lastResult && (
            <div className="relative flex items-start gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Code redeemed successfully!
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
                onClick={() => setLastResult(null)}
                className="shrink-0 rounded p-0.5 hover:bg-emerald-500/20"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#D4A017]" />
                Redeem a code
              </CardTitle>
              <CardDescription>
                Enter the unique code printed on your Amstel product or voucher.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleRedeem}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="AMSTEL-XXXX-XXXX"
                  className="flex-1 font-mono text-base tracking-widest"
                  disabled={redeem.isPending}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <Button
                  type="submit"
                  disabled={!code || redeem.isPending}
                  className="shrink-0 bg-[#C8102E] hover:bg-[#a00d24] text-white"
                >
                  {redeem.isPending ? 'Redeeming…' : 'Redeem'}
                </Button>
              </form>

              {/* Error display */}
              {redeem.isError && (
                <p className="text-sm text-destructive">
                  {(redeem.error as Error)?.message ?? 'Failed to redeem. Please try again.'}
                </p>
              )}

              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Find the code on your Amstel bottle, can, or promo voucher</li>
                  <li>Enter the code above and click Redeem</li>
                  <li>Points are added instantly to your wallet</li>
                  <li>Use points for rewards or tournament entries</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rank card */}
        <Card className="border-[#D4A017]/40 bg-[#D4A017]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#D4A017]" />
              Your rank
            </CardTitle>
            <CardDescription>Current leaderboard standing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#D4A017]">
                {me?.rank ? `#${me.rank}` : '—'}
              </span>
              {me?.region && <Badge variant="gold">{me.region}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Keep redeeming to climb the leaderboard and win prizes.
            </p>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Lifetime points</p>
              <p className="text-xl font-bold">
                {walletLoading ? '—' : (wallet?.lifetimePoints ?? 0).toLocaleString()}
              </p>
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
              { key: 'description', header: 'Description', render: (r) => r.description ?? r.source ?? '—' },
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
                  <span className={r.points < 0 ? 'text-destructive' : 'text-emerald-600 font-medium'}>
                    {r.points > 0 ? '+' : ''}
                    {r.points.toLocaleString()}
                  </span>
                ),
              },
              { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
            ]}
            rows={transactions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
