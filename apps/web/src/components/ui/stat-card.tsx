'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  /** Signed percentage change, e.g. 12.4 or -3.1. */
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  accent?: 'red' | 'gold';
}

export function StatCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
  accent = 'red',
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  const isRed = accent === 'red';

  return (
    <div>
      <Card className="relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-1.5',
            isRed ? 'bg-amstel-red' : 'bg-amstel-gold',
          )}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5',
                isRed
                  ? 'bg-amstel-red/10 text-amstel-red'
                  : 'bg-amstel-gold/15 text-amstel-gold',
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {typeof delta === 'number' && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold',
                positive ? 'text-green-600 dark:text-green-400' : 'text-destructive',
              )}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {positive ? '+' : ''}
              {delta}%
            </span>
            {deltaLabel && (
              <span className="text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
