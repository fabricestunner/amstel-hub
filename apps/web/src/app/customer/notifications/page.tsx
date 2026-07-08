'use client';

import { AlertCircle, Bell, CheckCheck } from 'lucide-react';

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

function formatDateTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function CustomerNotificationsPage() {
  const { data: notifications, isLoading, isError, error, refetch } =
    useNotifications();
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
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
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
      ) : isError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <p>
              {(error as Error)?.message ??
                'We could not load your notifications.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              Try again
            </button>
          </div>
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <ul className="space-y-3" aria-label="Notifications">
          {notifications.map((n) => (
            <li key={n.id}>
              <Card
                className={cn(!n.read && 'border-secondary/50 bg-secondary/5')}
              >
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-secondary"
                          aria-hidden="true"
                        />
                      )}
                      <p className="font-medium">
                        {n.title}
                        {!n.read && (
                          <span className="sr-only"> (unread)</span>
                        )}
                      </p>
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                    )}
                    {n.createdAt && (
                      <time
                        dateTime={n.createdAt}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDateTime(n.createdAt)}
                      </time>
                    )}
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(n.id)}
                      aria-label={`Mark "${n.title}" as read`}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
