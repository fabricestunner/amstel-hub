import { cn } from '@/lib/utils';

export interface LogoProps {
  /** Pixel height of the emblem; text scales relative to this. */
  size?: number;
  /** Show the AMSTEL wordmark + REWARDS subtitle alongside the emblem. */
  withText?: boolean;
  className?: string;
}

/**
 * Amstel Rewards wordmark — pure SVG/CSS, no external image.
 * A red shield emblem with a gold star, paired with the AMSTEL wordmark.
 */
export function Logo({ size = 36, withText = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="Amstel Rewards"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="amstel-shield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(349 88% 50%)" />
            <stop offset="100%" stopColor="hsl(349 88% 36%)" />
          </linearGradient>
          <linearGradient id="amstel-star" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(43 90% 62%)" />
            <stop offset="100%" stopColor="hsl(43 74% 45%)" />
          </linearGradient>
        </defs>
        <path
          d="M24 2 6 9v14c0 11.5 7.7 19.6 18 23 10.3-3.4 18-11.5 18-23V9L24 2Z"
          fill="url(#amstel-shield)"
        />
        <path
          d="M24 13.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L24 13.5Z"
          fill="url(#amstel-star)"
        />
      </svg>
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
