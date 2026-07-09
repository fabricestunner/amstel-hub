import { Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const BENEFITS = [
  'Earn a point for every two Amstels',
  'Enter national pool tournaments',
  'Win prizes and Amstel merch',
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile */}
      <div className="relative hidden overflow-hidden bg-amstel-red md:flex md:w-[45%] md:flex-col md:items-center md:justify-center md:p-12 lg:w-1/2">
        {/* Subtle diagonal stripe texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Link href="/" aria-label="Amstel Rewards home">
            <Image
              src="/amstel-logo.jpg"
              alt="Amstel Beer"
              width={108}
              height={108}
              className="rounded-full shadow-2xl ring-4 ring-white/30 transition-transform duration-300 hover:scale-105"
              priority
            />
          </Link>

          <div className="mt-6 max-w-[18rem]">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Loyal Friends of Amstel Rewards
            </h1>
          </div>

          <div className="mt-8 space-y-1 leading-snug">
            <p className="text-4xl font-extrabold text-white">Earn. Play.</p>
            <p className="text-4xl font-extrabold text-amstel-gold">Win.</p>
          </div>

          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
            The Amstel rewards program in Rwanda. Buy Amstel, earn points, win
            free beer and prizes.
          </p>

          <div className="mt-10 w-full max-w-xs space-y-3 text-left">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amstel-gold/25">
                  <Check className="h-3 w-3 text-amstel-gold" strokeWidth={3} />
                </div>
                <span className="text-sm text-white/90">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-xs text-white/30">
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
