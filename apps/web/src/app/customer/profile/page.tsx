'use client';

import { Check } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  NotificationPreferences,
  useNotificationPreferences,
  useUpdatePreferences,
} from '@/features/notifications/use-notifications';
import { useMe } from '@/lib/auth';

const PREF_FIELDS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'email', label: 'Email', description: 'Receive updates by email' },
  { key: 'sms', label: 'SMS', description: 'Receive text messages' },
  { key: 'push', label: 'Push', description: 'Browser & app push notifications' },
  { key: 'promotions', label: 'Promotions', description: 'Offers and campaigns' },
  { key: 'tournaments', label: 'Tournaments', description: 'Tournament announcements' },
  { key: 'rewards', label: 'Rewards', description: 'New rewards and redemptions' },
];

function fullName(first?: string, last?: string, fallback?: string) {
  const name = [first, last].filter(Boolean).join(' ');
  return name || fallback || 'Member';
}

export default function CustomerProfilePage() {
  const { data: me, isLoading } = useMe();
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdatePreferences();

  function toggle(key: keyof NotificationPreferences) {
    update.mutate({ [key]: !prefs?.[key] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account and notification preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={me?.avatarUrl} alt="avatar" />
                <AvatarFallback>
                  {fullName(me?.firstName, me?.lastName, me?.email)
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {fullName(me?.firstName, me?.lastName, me?.fullName)}
                </p>
                <p className="text-sm text-muted-foreground">{me?.email}</p>
                {me?.phone && (
                  <p className="text-sm text-muted-foreground">{me.phone}</p>
                )}
                <Badge variant="gold" className="mt-1 capitalize">
                  {me?.role ?? 'customer'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Choose how you want to hear from us.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {PREF_FIELDS.map((field, idx) => {
            const enabled = !!prefs?.[field.key];
            return (
              <div key={field.key}>
                {idx > 0 && <Separator className="my-0" />}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                  <Button
                    variant={enabled ? 'gold' : 'outline'}
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => toggle(field.key)}
                  >
                    {enabled ? (
                      <>
                        <Check className="h-4 w-4" /> On
                      </>
                    ) : (
                      'Off'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
