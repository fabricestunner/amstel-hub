'use client';

import { ChevronLeft, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export interface SidebarProps {
  items: NavItem[];
  role?: string;
  className?: string;
}

export interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('space-y-0.5 p-3', className)}>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
              collapsed && 'justify-center px-0',
              active
                ? 'bg-amstel-red/10 text-amstel-red font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {active && !collapsed && (
              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-amstel-red" />
            )}
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, role, className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-[72px]' : 'w-64',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b px-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <Link href="/" aria-label="Amstel Rewards home">
          <Logo size={30} withText={!collapsed} />
        </Link>
        {!collapsed && role && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {role}
          </span>
        )}
      </div>

      <SidebarNav
        items={items}
        collapsed={collapsed}
        className="flex-1 overflow-y-auto"
      />

      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((c) => !c)}
          className={cn('w-full text-muted-foreground', collapsed && 'px-0')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180',
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
