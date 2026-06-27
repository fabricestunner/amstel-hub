/**
 * Shared contracts between the API and the web app. Keep this framework-free
 * (no Nest/Next imports) so both sides can depend on it safely.
 */

export const USER_ROLES = [
  'SUPER_ADMIN',
  'CAMPAIGN_MANAGER',
  'REGIONAL_MANAGER',
  'OUTLET_MANAGER',
  'CUSTOMER',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REWARD_TYPES = [
  'TOURNAMENT_ENTRY',
  'MERCHANDISE',
  'FREE_DRINK',
  'GIFT_ITEM',
  'CASH',
  'COUPON',
  'DIGITAL',
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface WalletDto {
  availablePoints: number;
  redeemedPoints: number;
  lifetimePoints: number;
}
