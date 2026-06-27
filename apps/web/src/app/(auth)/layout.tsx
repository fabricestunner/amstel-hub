import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-primary">
          AMSTEL
        </span>
        <span className="text-2xl font-extrabold tracking-tight text-secondary">
          REWARDS
        </span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Amstel Rewards Platform
      </p>
    </div>
  );
}
