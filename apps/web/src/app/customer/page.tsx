'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRedeemCode, useWallet } from '@/features/wallet/use-wallet';

export default function CustomerDashboard() {
  const { data: wallet, isLoading } = useWallet();
  const redeem = useRedeemCode();
  const [code, setCode] = useState('');

  return (
    <main className="container max-w-3xl space-y-8 py-12">
      <header>
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground">
          Redeem Amstel codes to earn points and unlock rewards.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available', value: wallet?.availablePoints },
          { label: 'Redeemed', value: wallet?.redeemedPoints },
          { label: 'Lifetime', value: wallet?.lifetimePoints },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {isLoading ? '—' : (c.value ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Redeem a code</h2>
        <div className="mt-4 flex gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AMSTEL-XXXX-XXXX"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            disabled={!code || redeem.isPending}
            onClick={() => redeem.mutate(code, { onSuccess: () => setCode('') })}
          >
            {redeem.isPending ? 'Redeeming…' : 'Redeem'}
          </Button>
        </div>
      </section>
    </main>
  );
}
