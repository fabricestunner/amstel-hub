'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { BracketView } from '@/features/tournaments/bracket-view';
import {
  BracketMatch,
  Tournament,
  TournamentRegistrant,
  useCreateTournament,
  useEnterMatchResult,
  useGenerateBracket,
  useTournamentBracket,
  useTournamentRegistrants,
  useTournaments,
} from '@/features/tournaments/use-tournaments';

const schema = z.object({
  name: z.string().min(2, 'Required'),
  description: z.string().optional(),
  entryPoints: z.coerce.number().int().min(0).optional(),
  prizePool: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxParticipants: z.coerce.number().int().min(0).optional(),
});
type FormValues = z.infer<typeof schema>;

function MatchResultForm({
  tournamentId,
  match,
}: {
  tournamentId: string;
  match: BracketMatch;
}) {
  const enter = useEnterMatchResult();
  const [a, setA] = useState(match.scoreA ?? 0);
  const [b, setB] = useState(match.scoreB ?? 0);

  if (match.winner) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        type="number"
        value={a}
        onChange={(e) => setA(Number(e.target.value))}
        className="h-8 w-14"
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        value={b}
        onChange={(e) => setB(Number(e.target.value))}
        className="h-8 w-14"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={enter.isPending}
        onClick={() =>
          enter.mutate({
            tournamentId,
            matchId: match.id,
            scoreA: a,
            scoreB: b,
          })
        }
      >
        Save
      </Button>
    </div>
  );
}

function BracketManager({ tournamentId }: { tournamentId: string }) {
  const bracket = useTournamentBracket(tournamentId);
  const generate = useGenerateBracket();
  const matches = bracket.data?.matches ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="gold"
          size="sm"
          disabled={generate.isPending}
          onClick={() => generate.mutate(tournamentId)}
        >
          {generate.isPending ? 'Generating…' : 'Generate bracket'}
        </Button>
      </div>
      {bracket.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <BracketView
          matches={matches}
          renderActions={(m) => (
            <MatchResultForm tournamentId={tournamentId} match={m} />
          )}
        />
      )}
    </div>
  );
}

function RegistrantsView({ tournamentId }: { tournamentId: string }) {
  const { data: registrants, isLoading } = useTournamentRegistrants(tournamentId);

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      <DataTable
        isLoading={isLoading}
        rows={registrants ?? []}
        columns={[
          { key: 'userName', header: 'Name' },
          { key: 'userEmail', header: 'Email', render: (r: TournamentRegistrant) => r.userEmail ?? '—' },
          { key: 'userPhone', header: 'Phone', render: (r: TournamentRegistrant) => r.userPhone ?? '—' },
          { key: 'outletName', header: 'Outlet', render: (r: TournamentRegistrant) => r.outletName ?? '—' },
          { key: 'pointsSpent', header: 'Points', render: (r: TournamentRegistrant) => r.pointsSpent.toLocaleString() },
          { key: 'status', header: 'Status', render: (r: TournamentRegistrant) => <Badge variant="outline" className="capitalize">{r.status.toLowerCase()}</Badge> },
          { key: 'registeredAt', header: 'Registered', render: (r: TournamentRegistrant) => formatDate(r.registeredAt) },
        ]}
      />
    </div>
  );
}

export default function AdminTournamentsPage() {
  const { data: tournaments, isLoading } = useTournaments();
  const create = useCreateTournament();
  const [open, setOpen] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);
  const [registrantsId, setRegistrantsId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onCreate(values: FormValues) {
    create.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments"
        description="Create tournaments and manage brackets."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New tournament
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            isLoading={isLoading}
            rows={tournaments ?? []}
            columns={[
              { key: 'name', header: 'Name' },
              {
                key: 'status',
                header: 'Status',
                render: (r: Tournament) => (
                  <Badge variant="secondary" className="capitalize">
                    {(r.status ?? 'draft').replace('_', ' ')}
                  </Badge>
                ),
              },
              {
                key: 'participantCount',
                header: 'Players',
                render: (r: Tournament) =>
                  `${(r.participantCount ?? 0).toLocaleString()}${r.maxParticipants ? ` / ${r.maxParticipants}` : ''}`,
              },
              {
                key: 'entryPoints',
                header: 'Entry',
                render: (r: Tournament) =>
                  (r.entryPoints ?? 0).toLocaleString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r: Tournament) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRegistrantsId(registrantsId === r.id ? null : r.id)
                      }
                    >
                      {registrantsId === r.id ? 'Close' : 'View registrants'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setManageId(manageId === r.id ? null : r.id)
                      }
                    >
                      {manageId === r.id ? 'Close' : 'Manage bracket'}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {manageId && (
        <Card>
          <CardContent className="pt-6">
            <BracketManager tournamentId={manageId} />
          </CardContent>
        </Card>
      )}

      {registrantsId && (
        <Card>
          <CardContent className="pt-6">
            <RegistrantsView tournamentId={registrantsId} />
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle>New tournament</DialogTitle>
              <DialogDescription>
                Set up a competitive tournament for customers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryPoints">Entry points</Label>
                  <Input
                    id="entryPoints"
                    type="number"
                    {...register('entryPoints')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max players</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    {...register('maxParticipants')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizePool">Prize pool</Label>
                <Input id="prizePool" {...register('prizePool')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" type="date" {...register('endDate')} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
