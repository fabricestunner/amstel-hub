import {
  ArrowRight,
  Beer,
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

import { LandingHeaderCta } from '@/components/landing-header-cta';
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
    title: 'Collect points',
    desc: 'Every two Amstels you buy is one point in your wallet, ready to spend.',
  },
  {
    icon: Gift,
    title: 'Get free beer',
    desc: 'Ten points gets you a free Amstel. Spend the rest on vouchers, merch and pool tournament entries.',
  },
] as const;

const REWARDS = [
  { icon: Beer, name: 'Free Amstel', points: '10 pts', note: 'On the house' },
  { icon: Ticket, name: 'Amstel voucher', points: 'In app', note: 'Money off your tab' },
  { icon: Trophy, name: 'Tournament entry', points: 'In app', note: 'Play for prizes' },
  { icon: Shirt, name: 'Branded merch', points: 'In app', note: 'Caps and shirts' },
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
            <LandingHeaderCta />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero campaign artwork. The red canvas matches the supplied artwork so
            it remains full-bleed at every viewport width. */}
        <section className="relative overflow-hidden bg-amstel-red">
          <h1 className="sr-only">
            Earn. Play. Win. — Loyal Friends of Amstel Rewards
          </h1>
          {/* Mobile: portrait artwork */}
          <div className="relative mx-auto w-full max-w-[640px] sm:hidden">
            <Image
              src="/loyal-friends-hero.jpeg"
              alt="Loyal Friends of Amstel Pool Tournament — buy Amstel, collect points, and trade them for free beer, vouchers and pool tournament entries."
              width={4001}
              height={4501}
              priority
              className="h-auto w-full"
            />
          </div>

          {/* sm+ : landscape artwork with CTAs in the open lower-right area. */}
          <div className="relative mx-auto hidden w-full sm:block">
            <Image
              src="/loyal-friends-hero-wide.jpeg"
              alt="Loyal Friends of Amstel Pool Tournament — buy Amstel, collect points, and trade them for free beer, vouchers and pool tournament entries."
              width={8000}
              height={2793}
              priority
              className="h-auto w-full"
            />

            <div className="absolute bottom-[8%] right-[7%] flex items-center gap-[clamp(0.5rem,1.5vw,1.5rem)]">
              <SmartRedeemButton
                size="default"
                className="bg-amstel-gold px-[clamp(1rem,2.5vw,2.5rem)] font-bold text-white shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]"
              >
                Scan a code <ArrowRight className="h-4 w-4" />
              </SmartRedeemButton>
              <Button
                asChild
                className="border border-white/30 bg-amstel-red px-[clamp(1rem,2.5vw,2.5rem)] font-bold text-white transition-colors duration-200 hover:bg-amstel-red-dark"
              >
                <Link href="/register">Join Friends of Amstel</Link>
              </Button>
            </div>
          </div>

          {/* Mobile CTAs: in-flow on the red band directly below the artwork */}
          <div className="flex flex-col gap-2 px-6 pb-8 pt-3 sm:hidden">
            <SmartRedeemButton
              size="default"
              className="w-full bg-amstel-gold font-bold text-white shadow-gold"
            >
              Scan a code <ArrowRight className="h-4 w-4" />
            </SmartRedeemButton>
            <Button
              asChild
              className="w-full border border-white/30 bg-amstel-red font-bold text-white hover:bg-amstel-red-dark"
            >
              <Link href="/register">Join Friends of Amstel</Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b bg-muted/30 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three steps. No receipts, no forms.
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
              What your points get you
            </h2>
            <p className="mt-3 text-muted-foreground">
              Earn a point for every two Amstels. A free Amstel is 10 points,
              and the full rewards list lives in the app.
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
              Your next Amstel is worth free beer
            </h2>
            <p className="mt-3 max-w-lg text-white/85">
              Create a free account in under a minute and start earning today.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <SmartRedeemButton className="bg-amstel-gold font-bold text-white shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]">
                Scan a code <ArrowRight className="h-4 w-4" />
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
