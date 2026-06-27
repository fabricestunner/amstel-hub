'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { BracketMatch } from '@/features/tournaments/use-tournaments';

function stageLabel(match: BracketMatch): string {
  return match.stage ?? (match.round != null ? `Round ${match.round}` : 'Stage');
}

export function BracketView({
  matches,
  renderActions,
}: {
  matches: BracketMatch[];
  renderActions?: (match: BracketMatch) => React.ReactNode;
}) {
  const stages = useMemo(() => {
    const groups = new Map<string, BracketMatch[]>();
    for (const m of matches) {
      const key = stageLabel(m);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return Array.from(groups.entries());
  }, [matches]);

  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No matches have been scheduled yet.
      </p>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {stages.map(([stage, group]) => (
        <div key={stage} className="min-w-[16rem] space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">{stage}</h4>
          {group.map((match) => {
            const decided = match.winner != null;
            return (
              <Card key={match.id}>
                <CardContent className="space-y-2 p-4">
                  <PlayerRow
                    name={match.playerA}
                    score={match.scoreA}
                    winner={decided && match.winner === match.playerA}
                  />
                  <div className="h-px bg-border" />
                  <PlayerRow
                    name={match.playerB}
                    score={match.scoreB}
                    winner={decided && match.winner === match.playerB}
                  />
                  {match.status && (
                    <Badge
                      variant={decided ? 'success' : 'secondary'}
                      className="mt-1"
                    >
                      {match.status}
                    </Badge>
                  )}
                  {renderActions?.(match)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PlayerRow({
  name,
  score,
  winner,
}: {
  name?: string;
  score?: number | null;
  winner?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className={winner ? 'font-semibold text-secondary' : ''}>
        {name ?? 'TBD'}
      </span>
      <span className="tabular-nums text-muted-foreground">
        {score ?? '–'}
      </span>
    </div>
  );
}
