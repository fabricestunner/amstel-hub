'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Separator } from '@/components/ui/separator';
import { useLogout, useMe } from '@/lib/auth';

export default function AdminSettingsPage() {
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your admin profile and platform preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your administrator account details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              defaultValue={[me?.firstName, me?.lastName]
                .filter(Boolean)
                .join(' ')}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={me?.email ?? ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" defaultValue={me?.role ?? ''} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform</CardTitle>
          <CardDescription>
            General platform configuration (read-only placeholder).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program">Program name</Label>
            <Input id="program" defaultValue="Amstel Rewards" readOnly />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="currency">Points currency label</Label>
            <Input id="currency" defaultValue="points" readOnly />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={() => logout()}>
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
