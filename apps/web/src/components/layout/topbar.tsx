'use client';

import { Bell, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { initials } from '@/lib/format';
import { useLogout } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  title?: string;
  user?: { name?: string; email?: string; avatarUrl?: string };
  notificationCount?: number;
  nav?: NavItem[];
  role?: string;
  className?: string;
}

export function Topbar({
  title,
  user,
  notificationCount = 0,
  nav,
  role,
  className,
}: TopbarProps) {
  const displayName = user?.name ?? 'Account';
  const logout = useLogout();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6',
        className,
      )}
    >
      {nav && nav.length > 0 && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          {/* aria-describedby={undefined} silences Radix's missing-description warning */}
          <SheetContent
            side="left"
            aria-describedby={undefined}
            className="flex w-72 flex-col p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center justify-between border-b py-4 pl-4 pr-12">
              <Logo size={30} withText />
              {role && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {role}
                </span>
              )}
            </div>
            <SidebarNav
              items={nav}
              onNavigate={() => setMobileNavOpen(false)}
              className="flex-1 overflow-y-auto"
            />
          </SheetContent>
        </Sheet>
      )}

      {title && (
        <h1 className="hidden text-lg font-semibold lg:block">{title}</h1>
      )}

      <div className="relative ml-auto w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          aria-label="Search"
          className="pl-9"
        />
      </div>

      <ThemeToggle />

      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open account menu"
          >
            <Avatar className="h-9 w-9">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-amstel-red to-amstel-red-dark text-white">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-0.5">
              <span className="text-sm font-medium">{displayName}</span>
              {user?.email && (
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
