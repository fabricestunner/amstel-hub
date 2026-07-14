'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  Tournament,
  TournamentRegistrant,
  useTournamentRegistrants,
  useTournaments,
} from '@/features/tournaments/use-tournaments';

function formatDate(value?: string) {
  if (!value) return 'TBD';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'TBD' : d.toLocaleDateString();
}

function RegistrantsView({ tournamentId }: { tournamentId: string }) {
  const { data: registrants, isLoading } = useTournamentRegistrants(tournamentId);
  const count = registrants?.length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Registrants at your outlet</h3>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {count.toLocaleString()} {count === 1 ? 'person' : 'people'}{' '}
            registered representing your outlet.
          </p>
        )}
      </div>
      <DataTable
      isLoading={isLoading}
      rows={registrants ?? []}
      columns={[
        { key: 'userName', header: 'Name' },
        { key: 'outletName', header: 'Outlet', render: (r: TournamentRegistrant) => r.outletName ?? '—' },
        { key: 'pointsSpent', header: 'Points', render: (r: TournamentRegistrant) => r.pointsSpent.toLocaleString() },
        { key: 'status', header: 'Status', render: (r: TournamentRegistrant) => <Badge variant="outline" className="capitalize">{r.status.toLowerCase()}</Badge> },
        { key: 'registeredAt', header: 'Registered', render: (r: TournamentRegistrant) => formatDate(r.registeredAt) },
      ]}
      />
    </div>
  );
}

export default function OutletTournamentsPage() {
  const { data: tournaments, isLoading } = useTournaments();
  const [registrantsId, setRegistrantsId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments"
        description="Active and upcoming tournaments to promote in your outlet."
      />
      <Card>
        <CardContent className="pt-6">
          {!isLoading && (!tournaments || tournaments.length === 0) ? (
            <EmptyState
              icon={<Trophy className="h-10 w-10" />}
              title="No tournaments"
              description="There are no tournaments scheduled right now."
            />
          ) : (
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
                      {(r.status ?? 'open').replace('_', ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'participantCount',
                  header: 'Players',
                  render: (r: Tournament) =>
                    (r.participantCount ?? 0).toLocaleString(),
                },
                {
                  key: 'startDate',
                  header: 'Starts',
                  render: (r: Tournament) => formatDate(r.startDate),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r: Tournament) => (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRegistrantsId(registrantsId === r.id ? null : r.id)
                        }
                      >
                        {registrantsId === r.id ? 'Close' : 'View registrants'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {registrantsId && (
        <Card>
          <CardContent className="pt-6">
            <RegistrantsView tournamentId={registrantsId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
