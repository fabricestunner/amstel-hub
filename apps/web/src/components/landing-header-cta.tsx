'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { roleHome, useMe } from '@/lib/auth';

/**
 * Header call-to-action on the public landing page. Session-aware so a
 * logged-in visitor sees a single "Go to dashboard" link instead of being
 * asked to sign in again. Falls back to Sign in / Join for logged-out
 * visitors, which is also what renders during SSR and first paint.
 */
export function LandingHeaderCta() {
  const { data: user, isError } = useMe();
  const signedIn = !!user && !isError;

  if (signedIn) {
    return (
      <Button
        asChild
        size="sm"
        className="bg-amstel-red text-white transition-colors duration-200 hover:bg-amstel-red-dark"
      >
        <Link href={roleHome(user.role)}>
          Go to dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="hidden sm:inline-flex"
      >
        <Link href="/login">Sign in</Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="bg-amstel-red text-white transition-colors duration-200 hover:bg-amstel-red-dark"
      >
        <Link href="/register">
          Join Friends of Amstel <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </>
  );
}
