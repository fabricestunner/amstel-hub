import Image from 'next/image';

import { cn } from '@/lib/utils';

export interface LogoProps {
  size?: number;
  withText?: boolean;
  className?: string;
}

export function Logo({ size = 36, withText = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/amstel-logo.jpg"
        alt="Amstel"
        width={size}
        height={size}
        className="shrink-0 rounded-full"
        priority
      />
      {withText && (
        <span className="flex flex-col leading-none">
          <span
            className="font-extrabold tracking-tight text-amstel-gradient"
            style={{ fontSize: size * 0.55 }}
          >
            AMSTEL
          </span>
          <span
            className="font-semibold uppercase tracking-[0.32em] text-muted-foreground"
            style={{ fontSize: size * 0.2 }}
          >
            Rewards
          </span>
        </span>
      )}
    </span>
  );
}
