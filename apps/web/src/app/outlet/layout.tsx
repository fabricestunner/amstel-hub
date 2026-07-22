'use client';

import {
  Award,
  FileText,
  Gift,
  LayoutDashboard,
  Sparkles,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/outlet', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/outlet/customers', label: 'Customers', icon: Users },
  { href: '/outlet/vouchers', label: 'Vouchers', icon: Ticket },
  { href: '/outlet/redemptions', label: 'Redemptions', icon: Gift },
  { href: '/outlet/rewards', label: 'Outlet Rewards', icon: Sparkles },
  { href: '/outlet/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/outlet/leaderboard', label: 'Leaderboard', icon: Award },
  { href: '/outlet/reports', label: 'Reports', icon: FileText },
];

export default function OutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth({
    redirectTo: '/login',
    roles: ['OUTLET_MANAGER', 'SUPER_ADMIN'],
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <DashboardShell nav={nav} role="outlet" title="Outlet Portal">
      {children}
    </DashboardShell>
  );
}
