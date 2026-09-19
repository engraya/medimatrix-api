import type { NotificationChannel, NotificationType } from '@prisma/client';
import type { Transaction } from '../../lib/prisma.js';
import { seal } from '../../utils/encryption.js';
export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  key: string;
  channels?: NotificationChannel[];
  sensitive?: boolean;
}
export const mandatoryTypes: NotificationType[] = [
  'OTP',
  'PASSWORD_RESET',
  'EMAIL_VERIFICATION',
  'STAFF_INVITE',
];
export async function enqueue(tx: Transaction, input: NotificationInput) {
  const preferences = await tx.notificationPreference.findMany({
    where: { userId: input.userId, type: input.type },
  });
  for (const channel of input.channels ?? ['IN_APP', 'EMAIL', 'SMS']) {
    const disabled =
      !mandatoryTypes.includes(input.type) &&
      preferences.some((p) => p.channel === channel && !p.enabled);
    const dedupeKey = `${input.type}:${input.userId}:${input.key}:${channel}`;
    await tx.notification.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        userId: input.userId,
        type: input.type,
        channel,
        title: input.title,
        body: input.sensitive ? seal(input.body) : input.body,
        data: input.sensitive
          ? {
              encrypted: true,
              expiresAt: new Date(
                Date.now() +
                  (input.type === 'OTP'
                    ? 600000
                    : input.type === 'EMAIL_VERIFICATION'
                      ? 86400000
                      : 1800000),
              ).toISOString(),
            }
          : {},
        dedupeKey,
        status: disabled ? 'SKIPPED' : 'PENDING',
      },
    });
  }
}
