'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useVerifyPhone } from '@/features/auth/use-auth-mutations';

const LENGTH = 6;

function VerifyOtpForm() {
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';
  const verify = useVerifyPhone();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join('');

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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    const next = Array(LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  function submit() {
    if (code.length !== LENGTH) return;
    verify.mutate({ phone, code });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your phone</CardTitle>
        <CardDescription>
          We sent a 6-digit code{phone ? ` to ${phone}` : ''}. Enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <Input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-12 text-center text-2xl font-semibold"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={submit}
          disabled={code.length !== LENGTH || verify.isPending}
        >
          {verify.isPending ? 'Verifying…' : 'Verify'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
