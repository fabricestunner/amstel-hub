'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import type { Paginated } from '@/features/users/use-users';
import { queryKeys } from '@/lib/query-keys';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'open' | 'in_progress' | 'completed' | string;
  entryPoints?: number;
  prizePool?: string | number;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  participantCount?: number;
  registered?: boolean;
}

export interface BracketMatch {
  id: string;
  stage?: string;
  round?: number;
  matchNumber?: number;
  playerA?: string;
  playerB?: string;
  scoreA?: number | null;
  scoreB?: number | null;
  winner?: string | null;
  status?: string;
}

export interface Bracket {
  tournamentId: string;
  matches: BracketMatch[];
}

export function useTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments,
    queryFn: () =>
      api.get<Tournament[] | Paginated<Tournament>>('/tournaments'),
    select: (data) => (Array.isArray(data) ? data : data.items ?? []),
  });
}

export function useTournamentBracket(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bracket(id ?? ''),
    queryFn: () => api.get<Bracket>(`/tournaments/${id}/bracket`),
    enabled: !!id,
  });
}

export function useRegisterTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/tournaments/${id}/register`, {}),
    onSuccess: () => {
      toast.success('Registered for tournament!');
      qc.invalidateQueries({ queryKey: queryKeys.tournaments });
      qc.invalidateQueries({ queryKey: queryKeys.wallet });
    },
    onError: (err: Error) => toast.error(err.message || 'Registration failed'),
  });
}

export interface TournamentInput {
  name: string;
  description?: string;
  entryPoints?: number;
  prizePool?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
}

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TournamentInput) =>
      api.post<Tournament>('/tournaments', input),
    onSuccess: () => {
      toast.success('Tournament created');
      qc.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create'),
  });
}

export function useGenerateBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Bracket>(`/tournaments/${id}/bracket`, {}),
    onSuccess: (_d, id) => {
      toast.success('Bracket generated');
      qc.invalidateQueries({ queryKey: queryKeys.bracket(id) });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not generate'),
  });
}

export function useEnterMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      tournamentId: string;
      matchId: string;
      scoreA: number;
      scoreB: number;
    }) =>
      api.patch(`/tournaments/${vars.tournamentId}/matches/${vars.matchId}/result`, {
        scoreA: vars.scoreA,
        scoreB: vars.scoreB,
      }),
    onSuccess: (_d, vars) => {
      toast.success('Result saved');
      qc.invalidateQueries({ queryKey: queryKeys.bracket(vars.tournamentId) });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save result'),
  });
}
