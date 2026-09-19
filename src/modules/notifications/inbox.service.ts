import { prisma, transaction } from '../../lib/prisma.js';
import { missing } from '../../errors/app-error.js';
import { z } from '../../utils/zod.js';
import { paging, pageMeta } from '../../utils/pagination.js';
import { inboxQuery, preferencesSchema } from './notifications.schema.js';
export async function inbox(userId: string, query: z.infer<typeof inboxQuery>) {
  const where = {
    userId,
    channel: 'IN_APP' as const,
    status: 'SENT' as const,
    ...(query.unread === true
      ? { readAt: null }
      : query.unread === false
        ? { readAt: { not: null } }
        : {}),
  };
  const [data, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      ...paging(query),
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, title: true, body: true, createdAt: true, readAt: true },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, channel: 'IN_APP', status: 'SENT', readAt: null },
    }),
  ]);
  return { data, meta: { ...pageMeta(query, total), unreadCount } };
}
export async function markRead(userId: string, id: string) {
  return transaction(async (tx) => {
    const row = await tx.notification.findFirst({
      where: { id, userId, channel: 'IN_APP', status: 'SENT' },
    });
    if (!row) throw missing();
    return tx.notification.update({
      where: { id },
      data: { readAt: row.readAt ?? new Date() },
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
    });
  });
}
export async function readAll(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, channel: 'IN_APP', status: 'SENT', readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
export const preferences = (userId: string) =>
  prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, channel: true, enabled: true },
  });
export async function updatePreferences(userId: string, rows: z.infer<typeof preferencesSchema>) {
  await transaction(async (tx) => {
    for (const row of rows)
      await tx.notificationPreference.upsert({
        where: { userId_type_channel: { userId, type: row.type, channel: row.channel } },
        update: { enabled: row.enabled },
        create: { userId, ...row },
      });
  });
  return preferences(userId);
}
