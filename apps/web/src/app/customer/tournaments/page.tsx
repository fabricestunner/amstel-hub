'use client';

import { AlertCircle, CalendarDays, Trophy, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Outlet,
  Tournament,
  useCustomerOutlets,
  useRegisterTournament,
  useTournamentBracket,
  useTournaments,
} from '@/features/tournaments/use-tournaments';
import { useWallet } from '@/features/wallet/use-wallet';

// The bracket is only shown on demand; keep it out of the initial page bundle.
const BracketView = dynamic(
  () =>
    import('@/features/tournaments/bracket-view').then((m) => m.BracketView),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 w-full" />,
  },
);

function formatDate(value?: string) {
  if (!value) return 'TBD';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'TBD' : d.toLocaleDateString();
}

export default function CustomerTournamentsPage() {
  const { data: tournaments, isLoading, isError, error, refetch } =
    useTournaments();
  const { data: wallet } = useWallet();
  const { data: customerOutlets } = useCustomerOutlets();
  const register = useRegisterTournament();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);
  const bracket = useTournamentBracket(openId ?? undefined);

  const available = wallet?.availablePoints ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments"
        description="Compete against other Amstel fans and win prizes."
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
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
                'We could not load tournaments right now.'}
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
      ) : !tournaments || tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="No tournaments yet"
          description="New tournaments are announced regularly. Stay tuned!"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t: Tournament) => {
            const entry = t.entryPoints ?? 0;
            const canAfford = available >= entry;
            const isOpen = t.status === 'open' || t.status === 'draft';
            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{t.name}</CardTitle>
                    <Badge
                      variant={
                        t.status === 'open'
                          ? 'success'
                          : t.status === 'in_progress'
                            ? 'gold'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {(t.status ?? 'open').replace('_', ' ')}
                    </Badge>
                  </div>
                  {t.description && (
                    <CardDescription>{t.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {(t.participantCount ?? 0).toLocaleString()}
                    {t.maxParticipants ? ` / ${t.maxParticipants}` : ''} players
                  </div>
                  {entry > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Entry: {entry.toLocaleString()} points
                    </div>
                  )}
                </CardContent>
                <CardFooter className="gap-2">
                  {t.registered ? (
                    <Badge variant="success">Registered</Badge>
                  ) : (
                    <Button
                      variant="gold"
                      disabled={!isOpen || !canAfford || register.isPending}
                      onClick={() => {
                        setSelectedOutletId(null);
                        setRegisteringTournamentId(t.id);
                        setDialogOpen(true);
                      }}
                    >
                      {!canAfford && entry > 0 ? 'Not enough points' : 'Register'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    aria-expanded={openId === t.id}
                    aria-controls={`bracket-${t.id}`}
                    onClick={() => setOpenId(openId === t.id ? null : t.id)}
                  >
                    {openId === t.id ? 'Hide bracket' : 'View bracket'}
                  </Button>
                </CardFooter>
                {openId === t.id && (
                  <CardContent id={`bracket-${t.id}`}>
                    {bracket.isLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <BracketView matches={bracket.data?.matches ?? []} />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Outlet to Represent</DialogTitle>
            <DialogDescription>
              Choose the outlet/bar you want to represent in this tournament. You can only select an outlet where you have previously scanned a code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {!customerOutlets || customerOutlets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need to scan a code at an outlet before you can register for a tournament.
              </p>
            ) : (
              <div className="space-y-2">
                {customerOutlets.map((outlet: Outlet) => (
                  <button
                    key={outlet.id}
                    type="button"
                    onClick={() => setSelectedOutletId(outlet.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedOutletId === outlet.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">{outlet.name}</div>
                    <div className="text-xs text-muted-foreground">Code: {outlet.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              disabled={!selectedOutletId || register.isPending}
              onClick={() => {
                if (selectedOutletId && registeringTournamentId) {
                  register.mutate({ tournamentId: registeringTournamentId, outletId: selectedOutletId });
                  setDialogOpen(false);
                }
              }}
            >
              Confirm Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
