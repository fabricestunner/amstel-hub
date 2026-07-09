import {
  ArrowRight,
  Beer,
  Check,
  Coins,
  Gift,
  QrCode,
  ShieldCheck,
  Shirt,
  Store,
  Ticket,
  Trophy,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { SmartRedeemButton } from '@/components/smart-redeem-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const STEPS = [
  {
    icon: QrCode,
    title: 'Scan or enter the code',
    desc: 'Every Amstel bottle, can and promo voucher carries a unique code. Scan the QR or type it into the app.',
  },
  {
    icon: Coins,
    title: 'Earn points instantly',
    desc: 'Each verified purchase adds a point to your wallet — one point for every Amstel — ready to spend whenever you like.',
  },
  {
    icon: Gift,
    title: 'Redeem rewards',
    desc: 'Spend points on vouchers, free drinks, merchandise and pool-tournament entries. Rewards start from just 2 points.',
  },
] as const;

const REWARDS = [
  { icon: Ticket, name: 'Amstel Voucher', points: '2 pts', note: 'Just two beers' },
  { icon: Beer, name: 'Free Amstel', points: '80 pts', note: 'On the house' },
  { icon: Trophy, name: 'Tournament entry', points: '100 pts', note: 'Play for prizes' },
  { icon: Shirt, name: 'Branded merch', points: '150 pts', note: 'Wear the crown' },
] as const;

const TRUST = [
  'Free to join',
  '1 point per Amstel',
  'Redeem from 2 points',
] as const;

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:bg-card/90">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            aria-label="Amstel Rewards home"
            className="inline-flex items-center gap-2.5"
          >
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel"
              width={40}
              height={40}
              className="rounded-full"
              priority
            />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-amstel-gradient">
                AMSTEL
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                Rewards
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-amstel-red text-white transition-colors duration-200 hover:bg-amstel-red-dark"
            >
              <Link href="/register">
                Join Friends of Amstel <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-amstel-red py-20 text-white md:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="container relative z-10 flex flex-col items-center gap-7 text-center">
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel Beer"
              width={132}
              height={132}
              className="rounded-full shadow-2xl ring-4 ring-white/30"
              priority
            />

            <Badge className="gap-1.5 border-white/25 bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              <Trophy className="h-3.5 w-3.5" /> Rwanda&apos;s brewery rewards
              program
            </Badge>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              Earn. Play.{' '}
              <span className="relative inline-block">
                Win.
                <span
                  aria-hidden
                  className="absolute -bottom-1.5 left-0 right-0 h-1.5 rounded-full bg-amstel-gold"
                />
              </span>
            </h1>

            <p className="max-w-xl text-lg text-white/85">
              Turn every Amstel into points, then spend them on vouchers, free
              drinks and entries to nationwide pool tournaments.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <SmartRedeemButton className="bg-amstel-gold font-semibold text-neutral-900 shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]">
                Redeem my points <ArrowRight className="h-4 w-4" />
              </SmartRedeemButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <Link href="/register">Join Friends of Amstel</Link>
              </Button>
            </div>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-sm text-white/85">
              {TRUST.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-amstel-gold" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b bg-muted/30 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                From a cold one to the winner&apos;s circle
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three simple steps — no receipts to keep, no forms to fill.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.title}
                    className="relative h-full overflow-hidden p-6 transition-shadow duration-200 hover:shadow-md"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 top-2 select-none text-7xl font-black text-amstel-red/[0.06]"
                    >
                      {i + 1}
                    </span>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amstel-red text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {step.desc}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Rewards showcase */}
        <section id="rewards" className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              What your points unlock
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real rewards you can claim in the app — the more you sip, the more
              you score.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REWARDS.map((r) => {
              const Icon = r.icon;
              return (
                <Card
                  key={r.name}
                  className="flex h-full flex-col items-center gap-3 p-6 text-center transition-transform duration-200 motion-safe:hover:-translate-y-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amstel-red/10 text-amstel-red">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.note}</p>
                  </div>
                  <Badge variant="gold" className="mt-auto">
                    {r.points}
                  </Badge>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Button
              asChild
              size="lg"
              className="bg-amstel-red text-white transition-colors duration-200 hover:bg-amstel-red-dark"
            >
              <Link href="/register">
                Join Friends of Amstel <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="relative overflow-hidden bg-amstel-red py-16 text-white md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="container relative z-10 flex flex-col items-center text-center">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              Your next Amstel is worth more than a good time
            </h2>
            <p className="mt-3 max-w-lg text-white/85">
              Create your free account in under a minute and start turning every
              purchase into rewards.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <SmartRedeemButton className="bg-amstel-gold font-semibold text-neutral-900 shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]">
                Redeem my points <ArrowRight className="h-4 w-4" />
              </SmartRedeemButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <Link href="/register">Join Friends of Amstel</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col gap-8 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link
              href="/"
              aria-label="Amstel Rewards home"
              className="inline-flex items-center gap-2"
            >
              <Image
                src="/amstel-logo.jpg"
                alt="Amstel"
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-sm font-bold text-amstel-gradient">
                AMSTEL REWARDS
              </span>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <span className="text-muted-foreground">Staff &amp; partners:</span>
              <Link
                href="/outlet"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Store className="h-3.5 w-3.5" /> Outlet
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Admin
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {year} Amstel Rewards. All rights reserved.</p>
            <p className="font-medium">
              Not for sale to persons under 18. Please drink responsibly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
