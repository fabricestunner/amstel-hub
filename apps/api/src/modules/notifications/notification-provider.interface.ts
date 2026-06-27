import { NotificationChannel } from '@prisma/client';

export interface OutboundNotification {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Channel delivery adapter. Concrete EMAIL/SMS/PUSH providers (SES, Twilio,
 * FCM, ...) will implement this and be wired in once credentials exist.
 * TODO: register provider implementations and dispatch through them.
 */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: OutboundNotification): Promise<{ ok: boolean; error?: string }>;
}
