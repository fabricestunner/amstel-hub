import type { BadgeProps } from '@/components/ui/badge';

/** Status → badge-variant mapping shared by the outlet-rewards and
 * admin outlet-rewards redemption tables. */
export function redemptionVariant(status?: string): NonNullable<BadgeProps['variant']> {
  switch (status) {
    case 'APPROVED':
      return 'gold';
    case 'FULFILLED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'warning';
  }
}

export function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
