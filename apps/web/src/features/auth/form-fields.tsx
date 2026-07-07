'use client';

import { AlertCircle, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Inline field error. Renders icon + text and announces itself to screen
 * readers via role="alert" (WCAG: don't convey errors by color/visual alone).
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-1.5 text-sm text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * Text input with a leading brand icon and the shared amstel focus ring.
 * Matches the login/register field treatment so every auth screen is uniform.
 */
export const IconInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { icon: LucideIcon }
>(({ icon: Icon, className, ...props }, ref) => {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        className={cn('pl-9 focus-visible:ring-amstel-red/40', className)}
        {...props}
      />
    </div>
  );
});
IconInput.displayName = 'IconInput';

/**
 * Password input with a leading icon and a show/hide toggle (Material:
 * password-toggle). The toggle is a real button with an aria-label and a
 * 44px-min tap area, and never shifts layout.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { icon: LucideIcon }
>(({ icon: Icon, className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pl-9 pr-11 focus-visible:ring-amstel-red/40', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amstel-red/40"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
