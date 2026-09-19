import { NotificationType, NotificationChannel } from '@prisma/client';
import { z, booleanQuery, pagination } from '../../utils/zod.js';
export const inboxQuery = z.object({ ...pagination, unread: booleanQuery.optional() }).strict();
export const preferencesSchema = z
  .array(
    z
      .object({
        type: z.nativeEnum(NotificationType),
        channel: z.nativeEnum(NotificationChannel),
        enabled: z.boolean(),
      })
      .strict(),
  )
  .max(24)
  .refine(
    (rows) => new Set(rows.map((r) => `${r.type}:${r.channel}`)).size === rows.length,
    'Duplicate preference',
  );
