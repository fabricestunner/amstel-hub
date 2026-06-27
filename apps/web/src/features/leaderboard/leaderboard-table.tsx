'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { LeaderboardEntry } from '@/features/leaderboard/use-leaderboard';

function rankBadge(rank: number) {
  if (rank === 1) return <Badge variant="gold">#1</Badge>;
  if (rank === 2) return <Badge variant="secondary">#2</Badge>;
  if (rank === 3) return <Badge variant="warning">#3</Badge>;
  return <span className="text-muted-foreground">#{rank}</span>;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function LeaderboardTable({
  entries,
  isLoading,
  showAvatar = true,
}: {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <DataTable
      isLoading={isLoading}
      rows={entries}
      columns={[
        {
          key: 'rank',
          header: 'Rank',
          render: (r) => rankBadge(r.rank),
        },
        {
          key: 'name',
          header: 'Name',
          render: (r) =>
            showAvatar ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatarUrl} alt={r.name} />
                  <AvatarFallback>{initials(r.name ?? '?')}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{r.name}</span>
              </div>
            ) : (
              <span className="font-medium">{r.name}</span>
            ),
        },
        {
          key: 'region',
          header: 'Region',
          render: (r) => r.region ?? '—',
        },
        {
          key: 'points',
          header: 'Points',
          render: (r) => (
            <span className="font-semibold tabular-nums">
              {r.points.toLocaleString()}
            </span>
          ),
        },
      ]}
    />
  );
}
