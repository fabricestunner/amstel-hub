'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useVerifyOtp } from '@/features/auth/use-auth-mutations';

const LENGTH = 6;

function VerifyOtpForm() {
  const params = useSearchParams();
  const identifier = params.get('identifier') ?? '';
  const verify = useVerifyOtp();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join('');

  function submit() {
    if (code.length !== LENGTH) return;
    verify.mutate({ identifier, code });
  }

  function setDigit(index: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    if (v && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, LENGTH);
    if (!pasted) return;
    const next = Array(LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Verify your account
        </CardTitle>
        <CardDescription>
          We sent a 6-digit code{identifier ? ` to ${identifier}` : ''}. Enter it
          below.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <Input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-full px-0 text-center text-2xl font-semibold focus-visible:ring-amstel-red/40"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-4 pt-2 pb-6">
        <Button
          className="w-full bg-amstel-red text-white hover:bg-amstel-red-dark"
          onClick={submit}
          disabled={code.length !== LENGTH || verify.isPending}
        >
          {verify.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify'
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get a code?{' '}
          <Link
            href="/register"
            className="font-semibold text-amstel-red hover:underline"
          >
            Try again
          </Link>
        </p>
      </CardFooter>
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
