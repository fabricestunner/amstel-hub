'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { hasStoredSession } from '@/lib/auth';

/**
 * "Scan a code" CTA. Auth-aware, resolved purely client-side (no network) so
 * it never blocks on a cold-starting backend:
 *   - session present → /customer dashboard (one tap back in)
 *   - no session      → /login
 *
 * Defaults to /login for SSR / first paint so the logged-out majority sees no
 * hydration flicker; upgrades to /customer after mount when a session exists.
 */
export function SmartRedeemButton({
  className,
  variant = 'gold',
  size = 'lg',
  children = 'Scan a code',
  ...props
}: ButtonProps) {
  const [href, setHref] = useState('/login');

  useEffect(() => {
    if (hasStoredSession()) setHref('/customer');
  }, []);

  return (
    <Button asChild variant={variant} size={size} className={className} {...props}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
