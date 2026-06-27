'use client';

import {
  Bell,
  Gift,
  History,
  Trophy,
  Medal,
  User,
  Wallet,
} from 'lucide-react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/customer', label: 'Wallet', icon: Wallet },
  { href: '/customer/rewards', label: 'Rewards', icon: Gift },
  { href: '/customer/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/customer/leaderboard', label: 'Leaderboard', icon: Medal },
  { href: '/customer/history', label: 'History', icon: History },
  { href: '/customer/notifications', label: 'Notifications', icon: Bell },
  { href: '/customer/profile', label: 'Profile', icon: User },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth({ redirectTo: '/login' });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-64 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <DashboardShell nav={nav} role="customer" title="Amstel Rewards">
      {children}
    </DashboardShell>
  );
}
