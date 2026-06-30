'use client';

import { useEffect, useState } from 'react';

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
import {
  useChangePassword,
  useSettings,
  useUpdateProfile,
  useUpdateSettings,
} from '@/features/settings/use-settings';
import { useLogout, useMe } from '@/lib/auth';

export default function AdminSettingsPage() {
  const { data: me } = useMe();
  const logout = useLogout();

  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const canEditPlatform =
    me?.role === 'SUPER_ADMIN' || me?.role === 'CAMPAIGN_MANAGER';

  /* ── Profile ─────────────────────────────────────────────── */
  const updateProfile = useUpdateProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? '');
      setLastName(me.lastName ?? '');
    }
  }, [me]);

  /* ── Password ────────────────────────────────────────────── */
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
        },
      },
    );
  }

  /* ── Platform settings ───────────────────────────────────── */
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [programName, setProgramName] = useState('');
  const [pointsLabel, setPointsLabel] = useState('');
  const [defaultPointsPerCode, setDefaultPointsPerCode] = useState('');
  const [defaultPointsExpiryDays, setDefaultPointsExpiryDays] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setProgramName(settings.programName);
      setPointsLabel(settings.pointsLabel);
      setDefaultPointsPerCode(String(settings.defaultPointsPerCode));
      setDefaultPointsExpiryDays(String(settings.defaultPointsExpiryDays));
      setSupportEmail(settings.supportEmail);
    }
  }, [settings]);

  function onSavePlatform(e: React.FormEvent) {
    e.preventDefault();
    updateSettings.mutate({
      programName,
      pointsLabel,
      defaultPointsPerCode: Number(defaultPointsPerCode),
      defaultPointsExpiryDays: Number(defaultPointsExpiryDays),
      supportEmail,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your admin profile and platform configuration."
      />

      {/* Profile */}
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({ firstName, lastName });
          }}
        >
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your administrator account details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
          <CardFooter>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Password */}
      <Card>
        <form onSubmit={onChangePassword}>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Update the password you use to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={
                changePassword.isPending ||
                !currentPassword ||
                newPassword.length < 8
              }
            >
              {changePassword.isPending ? 'Updating…' : 'Change password'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Platform config */}
      <Card>
        <form onSubmit={onSavePlatform}>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>
              Program-wide configuration and campaign defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="programName">Program name</Label>
                <Input
                  id="programName"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  readOnly={!canEditPlatform}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pointsLabel">Points label</Label>
                <Input
                  id="pointsLabel"
                  value={pointsLabel}
                  onChange={(e) => setPointsLabel(e.target.value)}
                  readOnly={!canEditPlatform}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultPointsPerCode">Default points per code</Label>
                <Input
                  id="defaultPointsPerCode"
                  type="number"
                  min={0}
                  value={defaultPointsPerCode}
                  onChange={(e) => setDefaultPointsPerCode(e.target.value)}
                  readOnly={!canEditPlatform}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPointsExpiryDays">
                  Default points expiry (days, 0 = never)
                </Label>
                <Input
                  id="defaultPointsExpiryDays"
                  type="number"
                  min={0}
                  value={defaultPointsExpiryDays}
                  onChange={(e) => setDefaultPointsExpiryDays(e.target.value)}
                  readOnly={!canEditPlatform}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                readOnly={!canEditPlatform}
              />
            </div>
          </CardContent>
          {canEditPlatform && (
            <CardFooter>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Saving…' : 'Save platform settings'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of the admin console.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={() => logout()}>
            Sign out
          </Button>
        </CardFooter>
      </Card>

      {!isSuperAdmin && !canEditPlatform && (
        <p className="text-xs text-muted-foreground">
          Platform settings are read-only for your role.
        </p>
      )}
    </div>
  );
}
