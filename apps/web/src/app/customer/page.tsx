'use client';

import { Coins, Gift, Sparkles, TrendingUp, Trophy } from 'lucide-react';
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
import { useRedeemCode, useWallet } from '@/features/wallet/use-wallet';
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

  const transactions = txns?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${me?.firstName ? `, ${me.firstName}` : ''}`}
        description="Redeem Amstel codes to earn points and unlock rewards."
      />

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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Redeem a code
            </CardTitle>
            <CardDescription>
              Enter the unique code printed on your Amstel product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (code) redeem.mutate(code, { onSuccess: () => setCode('') });
              }}
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AMSTEL-XXXX-XXXX"
                className="flex-1"
              />
              <Button type="submit" disabled={!code || redeem.isPending}>
                {redeem.isPending ? 'Redeeming…' : 'Redeem'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-secondary/40 bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Your rank
            </CardTitle>
            <CardDescription>Current leaderboard standing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-secondary">
                {me?.rank ? `#${me.rank}` : '—'}
              </span>
              {me?.region && <Badge variant="gold">{me.region}</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep redeeming to climb the leaderboard.
            </p>
          </CardContent>
        </Card>
      </div>

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
                  <span className={r.points < 0 ? 'text-destructive' : 'text-emerald-600'}>
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
