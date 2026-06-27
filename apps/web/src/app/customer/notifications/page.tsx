'use client';

import { Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/features/notifications/use-notifications';
import { cn } from '@/lib/utils';

function timeAgo(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function CustomerNotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const hasUnread = (notifications ?? []).some((n) => !n.read);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay up to date with rewards, tournaments and more."
        actions={
          <Button
            variant="outline"
            disabled={!hasUnread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(!n.read && 'border-secondary/50 bg-secondary/5')}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-secondary" />
                    )}
                    <p className="font-medium">{n.title}</p>
                  </div>
                  {n.body && (
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
