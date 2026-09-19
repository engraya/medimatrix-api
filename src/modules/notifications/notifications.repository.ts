import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
export async function claimNotification() {
  const claimId = randomUUID();
  // The UPDATE and row lock are a single atomic statement, including stale lease recovery.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE notifications SET status = 'PROCESSING', claimed_at = NOW(), claim_id = ${claimId}::uuid, attempts = attempts + 1
    WHERE id = (SELECT id FROM notifications
      WHERE (status = 'PENDING' AND scheduled_for <= NOW())
         OR (status = 'PROCESSING' AND claimed_at < NOW() - INTERVAL '2 minutes')
      ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id`;
  if (!rows[0]) return null;
  return prisma.notification.findFirst({
    where: { id: rows[0].id, claimId },
    include: {
      user: { select: { email: true, phone: true, phoneVerifiedAt: true, deletedAt: true } },
    },
  });
}
export const workerRepository = {
  complete: (id: string, claimId: string, sensitive: boolean, skipped = false) =>
    prisma.notification.updateMany({
      where: { id, claimId, status: 'PROCESSING' },
      data: {
        status: skipped ? 'SKIPPED' : 'SENT',
        sentAt: new Date(),
        claimedAt: null,
        claimId: null,
        ...(sensitive ? { body: '[delivered or expired]', data: {} } : {}),
      },
    }),
  fail: (id: string, claimId: string, attempts: number, sensitive: boolean) =>
    prisma.notification.updateMany({
      where: { id, claimId, status: 'PROCESSING' },
      data: {
        status: attempts >= 5 ? 'FAILED' : 'PENDING',
        scheduledFor: new Date(Date.now() + 2 ** attempts * 60000),
        claimedAt: null,
        claimId: null,
        lastError: 'Provider delivery failed',
        ...(sensitive && attempts >= 5 ? { body: '[delivery failed]', data: {} } : {}),
      },
    }),
};
