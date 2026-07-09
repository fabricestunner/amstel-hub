import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Offline · Amstel Rewards',
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Image
        src="/amstel-logo.jpg"
        alt="Amstel"
        width={96}
        height={96}
        className="rounded-full shadow-lg ring-4 ring-amstel-red/20"
        priority
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-amstel-red">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-muted-foreground">
          We couldn&apos;t reach the Amstel Rewards servers. Check your
          connection and try again. Your points are safe.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-amstel-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amstel-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amstel-red/40 focus-visible:ring-offset-2"
      >
        Retry
      </Link>
    </div>
  );
}
