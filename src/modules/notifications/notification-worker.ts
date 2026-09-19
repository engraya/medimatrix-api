import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { unseal } from '../../utils/encryption.js';
import { fakeSms } from '../../lib/sms/fake.provider.js';
import { twilioSms } from '../../lib/sms/twilio.provider.js';
import { sendEmail } from '../emails/email.service.js';
import { claimNotification, workerRepository } from './notifications.repository.js';
export const workerState = { lastHeartbeat: null as Date | null, running: false };
export async function processNotifications(max = 20) {
  for (let i = 0; i < max; i++) {
    const row = await claimNotification();
    if (!row || !row.claimId) break;
    const metadata = row.data as { encrypted?: boolean; expiresAt?: string } | null;
    const sensitive = Boolean(metadata?.encrypted);
    try {
      if (row.attempts > 5) {
        await workerRepository.fail(row.id, row.claimId, row.attempts, sensitive);
        continue;
      }
      const expired = metadata?.expiresAt ? Date.parse(metadata.expiresAt) <= Date.now() : false;
      const unverifiedPhone =
        row.channel === 'SMS' && row.type !== 'OTP' && !row.user.phoneVerifiedAt;
      if (row.user.deletedAt || expired || unverifiedPhone) {
        await workerRepository.complete(row.id, row.claimId, sensitive, true);
        continue;
      }
      const body = sensitive ? unseal(row.body) : row.body;
      if (row.channel === 'EMAIL') await sendEmail(row.user.email, row.title, body, row.id);
      if (row.channel === 'SMS')
        await (env.SMS_PROVIDER === 'twilio' ? twilioSms : fakeSms).send(row.user.phone, body);
      await workerRepository.complete(row.id, row.claimId, sensitive);
    } catch {
      await workerRepository.fail(row.id, row.claimId, row.attempts, sensitive);
      logger.warn(
        { notificationId: row.id, attempts: row.attempts },
        'Notification delivery failed',
      );
      if (row.attempts >= 5)
        Sentry.captureMessage('Notification delivery exhausted', {
          level: 'error',
          tags: { notificationId: row.id },
        });
    }
  }
  workerState.lastHeartbeat = new Date();
}
export function startWorker() {
  let stopping = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> = Promise.resolve();
  const tick = () => {
    if (stopping) return;
    workerState.running = true;
    active = processNotifications()
      .catch(() => {
        logger.error('Outbox poll failed');
      })
      .finally(() => {
        workerState.running = false;
        if (!stopping) timer = setTimeout(tick, env.NOTIFICATION_WORKER_INTERVAL_MS);
      });
  };
  tick();
  return async () => {
    stopping = true;
    if (timer) clearTimeout(timer);
    await active;
  };
}
