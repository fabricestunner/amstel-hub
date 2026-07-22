/**
 * Centralized React Query keys so invalidation stays consistent across features.
 */
export const queryKeys = {
  me: ['me'] as const,
  wallet: ['wallet'] as const,
  transactions: (page?: number) =>
    page === undefined ? (['transactions'] as const) : (['transactions', page] as const),
  rewards: (type?: string) =>
    type === undefined ? (['rewards'] as const) : (['rewards', type] as const),
  rewardRedemptions: (status?: string) =>
    status === undefined
      ? (['reward-redemptions'] as const)
      : (['reward-redemptions', status] as const),
  outletRedemptions: (page?: number, status?: string) =>
    ['reward-redemptions', 'outlet', page, status] as const,
  outletRewards: ['outlet-rewards'] as const,
  outletRewardRedemptions: (status?: string) =>
    ['outlet-reward-redemptions', status] as const,
  campaigns: (page?: number) =>
    page === undefined ? (['campaigns'] as const) : (['campaigns', page] as const),
  campaignCodes: (id: string) => ['campaign-codes', id] as const,
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournament', id] as const,
  bracket: (id: string) => ['bracket', id] as const,
  outlets: (params?: unknown) => ['outlets', params] as const,
  vouchers: (params?: unknown) => ['vouchers', params] as const,
  outletDashboard: (id: string) => ['outlet-dashboard', id] as const,
  leaderboardCustomers: (period?: string) => ['leaderboard-customers', period] as const,
  leaderboardOutlets: (scope?: string, regionId?: string) =>
    ['leaderboard-outlets', scope, regionId] as const,
  outletCustomerLeaderboard: (outletId?: string, period?: string) =>
    ['outlet-customer-leaderboard', outletId, period] as const,
  analyticsOverview: ['analytics-overview'] as const,
  analyticsTrends: (range?: string) => ['analytics-trends', range] as const,
  notifications: ['notifications'] as const,
  notificationPreferences: ['notification-preferences'] as const,
  users: (params?: unknown) => ['users', params] as const,
  settings: ['settings'] as const,
  auditLogs: (page?: number, search?: string) =>
    ['audit-logs', page, search] as const,
  fraudFlags: (page?: number, status?: string) =>
    ['fraud-flags', page, status] as const,
} as const;
