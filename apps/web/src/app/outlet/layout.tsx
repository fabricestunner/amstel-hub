'use client';

import { FileText, LayoutDashboard, Trophy, Users } from 'lucide-react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/outlet', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/outlet/customers', label: 'Customers', icon: Users },
  { href: '/outlet/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/outlet/reports', label: 'Reports', icon: FileText },
];

export default function OutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth({
    redirectTo: '/login',
    roles: ['outlet', 'admin', 'super_admin'],
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
