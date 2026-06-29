import {
  ArrowRight,
  Gift,
  QrCode,
  ShieldCheck,
  Star,
  Store,
  Trophy,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ROLES = [
  {
    href: '/customer',
    label: 'Customer App',
    desc: 'Track your wallet, redeem rewards, enter pool tournaments and climb the national leaderboard.',
    icon: Users,
  },
  {
    href: '/outlet',
    label: 'Outlet Dashboard',
    desc: 'Manage your venue rank, monitor sales, register customers and track tournament entries.',
    icon: Store,
  },
  {
    href: '/admin',
    label: 'Admin Console',
    desc: 'Run campaigns, view analytics, manage users and outlets, and keep the platform fraud-free.',
    icon: ShieldCheck,
  },
] as const;

const STEPS = [
  {
    icon: QrCode,
    title: 'Scan the code',
    desc: 'Scan the Amstel code on your purchase at any participating outlet to verify it instantly.',
  },
  {
    icon: Star,
    title: 'Earn points',
    desc: 'Every verified purchase adds points to your wallet and moves you up the leaderboard.',
  },
  {
    icon: Gift,
    title: 'Win rewards',
    desc: 'Redeem exclusive rewards and qualify for live pool tournaments with major prizes.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm dark:bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Amstel Rewards home" className="inline-flex items-center gap-2.5">
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel"
              width={40}
              height={40}
              className="rounded-full"
              priority
            />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-amstel-gradient">AMSTEL</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">Rewards</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-amstel-red text-white transition-all duration-200 hover:bg-amstel-red-dark hover:shadow-md"
            >
              <Link href="/customer">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — Amstel red with subtle texture */}
        <section className="relative overflow-hidden bg-amstel-red py-20 text-white md:py-28">
          {/* Subtle diagonal stripe texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="container relative z-10 flex flex-col items-center gap-8 text-center">
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel Beer"
              width={140}
              height={140}
              className="rounded-full shadow-2xl ring-4 ring-white/30"
              priority
            />

            <Badge className="gap-1.5 border-white/30 bg-white/15 px-3 py-1 text-sm text-white backdrop-blur-sm">
              <Trophy className="h-3.5 w-3.5" /> Nationwide Loyalty &amp; Pool Tournament Campaign
            </Badge>

            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Earn. Play.{' '}
              <span className="relative inline-block">
                <span className="text-amstel-gold">Win.</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-amstel-gold/60" />
              </span>
            </h1>

            <p className="max-w-xl text-lg text-white/85">
              Every Amstel purchase earns you points, unlocks premium rewards,
              and qualifies you for pool tournaments. Track it all and climb
              the national leaderboard.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-amstel-gold text-white transition-all duration-200 hover:bg-amstel-gold-light hover:shadow-gold hover:scale-[1.02]"
              >
                <Link href="/customer">
                  Open Customer App <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white transition-all duration-200 hover:bg-white/20 hover:scale-[1.02]"
              >
                <Link href="/outlet">I&apos;m an outlet</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Role entry cards */}
        <section className="container py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Choose your dashboard</h2>
            <p className="mt-2 text-muted-foreground">Select the portal that matches your role.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <Link key={role.href} href={role.href} className="group block h-full">
                  <Card className="flex h-full flex-col gap-4 p-6 transition-all duration-200 hover:-translate-y-1.5 hover:border-amstel-red/40 hover:shadow-premium">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amstel-red text-white transition-all duration-200 group-hover:ring-2 group-hover:ring-amstel-gold/50 group-hover:ring-offset-2">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold transition-colors duration-150 group-hover:text-amstel-red">
                        {role.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">{role.desc}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-amstel-red">
                      Enter
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-3 text-muted-foreground">
                Three simple steps from a cold one to the winner&apos;s circle.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title} className="relative h-full p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                    {/* Large background number */}
                    <span className="absolute right-5 top-5 text-5xl font-extrabold text-amstel-red/8 select-none">
                      {i + 1}
                    </span>
                    {/* Gold step number badge */}
                    <div className="mb-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amstel-gold text-xs font-bold text-white shadow-sm">
                      {i + 1}
                    </div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amstel-red text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative overflow-hidden bg-amstel-red py-16 text-white">
          {/* Subtle radial glow at center */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="container relative z-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Ready to start earning?</h2>
            <p className="mt-3 text-white/85">
              Join thousands of players already racking up points and competing for the national pool crown.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-amstel-gold text-white transition-all duration-200 hover:bg-amstel-gold-light hover:shadow-gold hover:scale-[1.02]"
            >
              <Link href="/customer">
                Get the Customer App <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-amstel-red/10">
        <div className="container flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
          <Link href="/" aria-label="Amstel Rewards home" className="inline-flex items-center gap-2">
            <Image src="/amstel-logo.jpg" alt="Amstel" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-bold text-amstel-gradient">AMSTEL REWARDS</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/customer" className="hover:text-foreground transition-colors">Customer</Link>
            <Link href="/outlet" className="hover:text-foreground transition-colors">Outlet</Link>
            <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Amstel Rewards. Please drink responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}
