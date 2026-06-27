export const NOTIFICATION_QUEUE = 'notifications';

export interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  title: string;
  body: string;
}
