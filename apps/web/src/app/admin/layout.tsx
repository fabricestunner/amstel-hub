'use client';

import {
  Building2,
  FileText,
  Gift,
  LayoutDashboard,
  Medal,
  Megaphone,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/rewards', label: 'Rewards', icon: Gift },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/outlets', label: 'Outlets', icon: Building2 },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/leaderboards', label: 'Leaderboards', icon: Medal },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth({
    redirectTo: '/login',
    roles: ['admin', 'super_admin'],
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <DashboardShell nav={nav} role="admin" title="Admin Console">
      {children}
    </DashboardShell>
  );
}
