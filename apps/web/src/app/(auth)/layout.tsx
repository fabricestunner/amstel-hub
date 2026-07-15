import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { SmartRedeemButton } from '@/components/smart-redeem-button';
import { Button } from '@/components/ui/button';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile. Client campaign artwork; the
          panel aspect (~8:9 on desktop) almost exactly matches the artwork
          (1422×1600), so cover-fit shows it nearly uncropped. Badge pill and
          CTAs are overlaid in the artwork's flat-red areas. */}
      <div className="relative hidden overflow-hidden bg-[#EB1C24] md:block md:w-[45%] lg:w-1/2">
        <h1 className="sr-only">
          Earn. Play. Win. — Loyal Friends of Amstel Rewards
        </h1>
        <Link href="/" aria-label="Amstel Rewards home">
          <Image
            src="/loyal-friends-hero.jpeg"
            alt="Loyal Friends of Amstel Pool Tournament — buy Amstel, collect points, and trade them for free beer, vouchers and pool tournament entries."
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 45vw"
            className="object-cover"
          />
        </Link>

        <div className="absolute left-[36%] right-[4%] top-[26%] flex justify-center">
          <span className="w-full rounded-full bg-white/15 px-4 py-1.5 text-center text-[clamp(0.7rem,1.4vw,1.1rem)] font-bold text-white shadow-sm backdrop-blur-[2px]">
            Loyal Friends of Amstel Rewards
          </span>
        </div>

        <div className="absolute bottom-[5%] right-[5%] flex w-[44%] flex-col gap-3">
          <SmartRedeemButton
            size="default"
            className="w-full bg-amstel-gold font-bold text-white shadow-gold transition-transform duration-200 hover:bg-amstel-gold-light motion-safe:hover:scale-[1.02]"
          >
            Scan a code <ArrowRight className="h-4 w-4" />
          </SmartRedeemButton>
          <Button
            asChild
            className="w-full border border-white/30 bg-[#f6323c] font-bold text-white transition-colors duration-200 hover:bg-[#d81720]"
          >
            <Link href="/register">Join Friends of Amstel</Link>
          </Button>
        </div>

        <p className="absolute bottom-2 left-4 text-xs text-white/40">
          © {new Date().getFullYear()} Amstel Rewards Platform
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-6 sm:p-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex flex-col items-center md:hidden">
          <Link href="/" aria-label="Amstel Rewards home">
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel Beer"
              width={64}
              height={64}
              className="rounded-full shadow-md ring-2 ring-amstel-red/30"
              priority
            />
          </Link>
          <h1 className="mt-3 max-w-[16rem] text-center text-xl font-extrabold tracking-tight text-amstel-red">
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
  );
}
