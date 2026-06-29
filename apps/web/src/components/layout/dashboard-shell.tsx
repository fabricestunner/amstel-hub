'use client';

import * as React from 'react';

import { Sidebar, type NavItem } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

export interface DashboardShellProps {
  nav: NavItem[];
  role: string;
  title?: string;
  user?: { name?: string; email?: string; avatarUrl?: string };
  notificationCount?: number;
  className?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  nav,
  role,
  title,
  user,
  notificationCount,
  className,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar items={nav} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          user={user}
          notificationCount={notificationCount}
        />
        <main
          className={cn(
            'flex-1 p-4 md:p-6 lg:p-8',
            'mx-auto w-full max-w-7xl',
            className,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
