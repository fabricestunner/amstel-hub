import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { SmartRedeemButton } from '@/components/smart-redeem-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Shared header — lets the user get back to the public landing page
          from any auth screen (login, signup, forgot password, etc.). */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6 md:px-8 dark:bg-card/90">
        <Link
          href="/"
          aria-label="Amstel Rewards home"
          className="inline-flex items-center gap-2.5"
        >
          <Image
            src="/amstel-logo.jpg"
            alt="Amstel"
            width={32}
            height={32}
            className="rounded-full"
            priority
          />
          <span className="hidden text-sm font-extrabold tracking-tight text-amstel-gradient sm:inline">
            AMSTEL REWARDS
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-amstel-red"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Left brand panel — hidden on mobile. The supplied portrait campaign
            artwork keeps the same visual identity as the public landing page. */}
        <div className="relative hidden overflow-hidden bg-amstel-red md:block md:w-[45%] lg:w-1/2">
          <h1 className="sr-only">
            Earn. Play. Win. — Loyal Friends of Amstel Rewards
          </h1>
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
            <div className="relative flex w-full max-w-[560px] flex-1 items-center justify-center">
              <Image
                src="/loyal-friends-hero.jpeg"
                alt="Loyal Friends of Amstel Pool Tournament — buy Amstel, collect points, and trade them for free beer, vouchers and pool tournament entries."
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 45vw"
                className="object-contain"
              />
            </div>

            <Badge className="border-transparent bg-white/15 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/15">
              Loyal Friends of Amstel Rewards
            </Badge>

            <div className="flex w-full max-w-[560px] flex-col gap-3">
              <SmartRedeemButton
                size="default"
                className="w-full rounded-full bg-amstel-gold font-bold text-white shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]"
              >
                Scan a code <ArrowRight className="h-4 w-4" />
              </SmartRedeemButton>
              <Button
                asChild
                className="w-full rounded-full border border-white/30 bg-amstel-red font-bold text-white transition-colors duration-200 hover:bg-amstel-red-dark"
              >
                <Link href="/register">Join Friends of Amstel</Link>
              </Button>
            </div>
          </div>

          <p className="absolute bottom-2 left-4 text-xs text-white/40">
            © {new Date().getFullYear()} Amstel Rewards Platform
          </p>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-6 sm:p-12">
          {/* Mobile-only title */}
          <div className="mb-8 flex flex-col items-center md:hidden">
            <h1 className="max-w-[16rem] text-center text-xl font-extrabold tracking-tight text-amstel-red">
              Loyal Friends of Amstel Rewards
            </h1>
          </div>

          <div className="w-full max-w-md">
            {/* Red top-accent card wrapper */}
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="h-1 bg-amstel-red" />
              {children}
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground md:hidden">
            © {new Date().getFullYear()} Amstel Rewards Platform
          </p>
        </div>
      </div>
    </div>
  );
}
