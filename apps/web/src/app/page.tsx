import Link from 'next/link';

const ROLES = [
  { href: '/admin', label: 'Admin Dashboard', desc: 'Campaigns, analytics, users, fraud & reports.' },
  { href: '/outlet', label: 'Outlet Dashboard', desc: 'Rank, sales, customers & tournament entries.' },
  { href: '/customer', label: 'Customer App', desc: 'Wallet, rewards, tournaments & leaderboard.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="container flex flex-col items-center justify-center gap-10 py-24 text-center">
        <div className="space-y-4">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Nationwide Loyalty Campaign
          </span>
          <h1 className="text-5xl font-bold tracking-tight">
            Amstel Rewards Platform
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Earn points on every purchase, redeem rewards, qualify for pool
            tournaments, and climb the national leaderboard.
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {ROLES.map((r) => (
            <Link
              key={r.href}
              href={r.href as never}
              className="group rounded-xl border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <h2 className="text-lg font-semibold group-hover:text-primary">
                {r.label}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
