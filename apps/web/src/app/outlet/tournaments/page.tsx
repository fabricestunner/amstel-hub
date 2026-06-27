'use client';

import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Tournament, useTournaments } from '@/features/tournaments/use-tournaments';

function formatDate(value?: string) {
  if (!value) return 'TBD';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'TBD' : d.toLocaleDateString();
}

export default function OutletTournamentsPage() {
  const { data: tournaments, isLoading } = useTournaments();

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
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
