import { Queue } from 'bullmq';

import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationJobPayload } from './notification.queue';

/**
 * notifyAllChannels fans a single customer-facing event out to every channel
 * the customer can actually receive: IN_APP always, SMS only with a phone,
 * EMAIL only with an email. It resolves after all channels settle and never
 * throws — callers rely on fire-and-forget semantics.
 */
describe('NotificationsService.notifyAllChannels', () => {
  function build(contact: { email?: string | null; phone?: string | null } | null) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(contact) },
    } as unknown as PrismaService;
    const queue = {} as unknown as Queue<NotificationJobPayload>;
    const service = new NotificationsService(prisma, queue);
    const dispatch = jest
      .spyOn(service, 'dispatch')
      .mockResolvedValue({ id: 'n1' } as never);
    return { service, dispatch };
  }

  const opts = { title: 'Reward redeemed', body: 'full body', smsBody: 'sms body' };

  it('dispatches IN_APP, EMAIL and SMS when the customer has both contacts', async () => {
    const { service, dispatch } = build({ email: 'a@b.co', phone: '+250780000000' });

    await service.notifyAllChannels('u1', opts);

    const channels = dispatch.mock.calls.map((c) => c[1]);
    expect(channels).toEqual(
      expect.arrayContaining(['IN_APP', 'EMAIL', 'SMS']),
    );
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  it('sends the SMS-specific body over the SMS channel', async () => {
    const { service, dispatch } = build({ email: null, phone: '+250780000000' });

    await service.notifyAllChannels('u1', opts);

    const smsCall = dispatch.mock.calls.find((c) => c[1] === 'SMS');
    expect(smsCall?.[3]).toBe('sms body');
  });

  it('skips SMS when the customer has no phone', async () => {
    const { service, dispatch } = build({ email: 'a@b.co', phone: null });

    await service.notifyAllChannels('u1', opts);

    const channels = dispatch.mock.calls.map((c) => c[1]);
    expect(channels).toContain('IN_APP');
    expect(channels).toContain('EMAIL');
    expect(channels).not.toContain('SMS');
  });

  it('skips EMAIL when the customer has no email', async () => {
    const { service, dispatch } = build({ email: null, phone: '+250780000000' });

    await service.notifyAllChannels('u1', opts);

    const channels = dispatch.mock.calls.map((c) => c[1]);
    expect(channels).not.toContain('EMAIL');
  });

  it('is a no-op when the user cannot be found', async () => {
    const { service, dispatch } = build(null);

    await expect(service.notifyAllChannels('missing', opts)).resolves.toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('falls back to the full body for SMS when no smsBody is given', async () => {
    const { service, dispatch } = build({ email: null, phone: '+250780000000' });

    await service.notifyAllChannels('u1', { title: 'T', body: 'only body' });

    const smsCall = dispatch.mock.calls.find((c) => c[1] === 'SMS');
    expect(smsCall?.[3]).toBe('only body');
  });
});
