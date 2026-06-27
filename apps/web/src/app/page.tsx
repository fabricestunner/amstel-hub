'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Gift,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/brand/logo';
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
    accent: 'from-primary/15 to-primary/5 text-primary',
  },
  {
    href: '/outlet',
    label: 'Outlet Dashboard',
    desc: 'Manage rank, monitor sales, register customers and track tournament entries for your venue.',
    icon: Store,
    accent: 'from-accent/20 to-accent/5 text-accent-foreground',
  },
  {
    href: '/admin',
    label: 'Admin Console',
    desc: 'Run campaigns, view analytics, manage users and outlets, and keep the platform fraud-free.',
    icon: ShieldCheck,
    accent: 'from-primary/15 to-accent/10 text-primary',
  },
] as const;

const STEPS = [
  {
    icon: QrCode,
    title: 'Scan the code',
    desc: 'Scan the Amstel code on your purchase at any participating outlet to verify it instantly.',
  },
  {
    icon: Sparkles,
    title: 'Earn points',
    desc: 'Every verified purchase adds points to your wallet and moves you up the leaderboard.',
  },
  {
    icon: Gift,
    title: 'Win rewards',
    desc: 'Redeem exclusive rewards and qualify for live pool tournaments with major prizes.',
  },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo size={32} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/admin">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/customer">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-amstel-gradient pointer-events-none absolute inset-0 opacity-[0.07]" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

          <div className="container relative flex flex-col items-center gap-8 py-24 text-center md:py-32">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge variant="gold" className="gap-1.5 px-3 py-1 text-sm">
                <Trophy className="h-3.5 w-3.5" /> Nationwide Loyalty &amp; Pool
                Tournament Campaign
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
            >
              Earn points. Win big.{' '}
              <span className="text-amstel-gradient">Rule the table.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-2xl text-lg text-muted-foreground"
            >
              Every Amstel purchase earns you points, unlocks premium rewards,
              and gets you into the pool tournaments. Track it all and climb the
              national leaderboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Button asChild size="lg">
                <Link href="/customer">
                  Open Customer App <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/outlet">I&apos;m an outlet</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Role entry cards */}
        <section className="container -mt-12 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              return (
                <motion.div
                  key={role.href}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link href={role.href} className="group block h-full">
                    <Card className="flex h-full flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${role.accent}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold group-hover:text-primary">
                          {role.label}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {role.desc}
                        </p>
                      </div>
                      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Enter
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30 py-20">
          <div className="container">
            <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three simple steps from a cold one to the winner&apos;s circle.
              </p>
            </motion.div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    {...fadeUp}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <Card className="relative h-full p-6">
                      <span className="absolute right-5 top-5 text-5xl font-extrabold text-primary/10">
                        {i + 1}
                      </span>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {step.desc}
                      </p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="py-20">
          <div className="container">
            <motion.div {...fadeUp}>
              <Card className="bg-amstel-gradient relative overflow-hidden border-0 px-8 py-14 text-center text-white">
                <div className="pointer-events-none absolute inset-0 bg-black/10" />
                <div className="relative mx-auto max-w-2xl space-y-4">
                  <h2 className="text-3xl font-bold tracking-tight">
                    Ready to start earning?
                  </h2>
                  <p className="text-white/85">
                    Join thousands of players already racking up points and
                    competing for the national pool crown.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    variant="gold"
                    className="mt-2"
                  >
                    <Link href="/customer">
                      Get the Customer App <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
          <Logo size={28} />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/customer" className="hover:text-foreground">
              Customer
            </Link>
            <Link href="/outlet" className="hover:text-foreground">
              Outlet
            </Link>
            <Link href="/admin" className="hover:text-foreground">
              Admin
            </Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Amstel Rewards. Please drink
            responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}
