import { AppointmentStatus } from '@prisma/client';
import { z, uuid, futureDate, dateTime, pagination } from '../../utils/zod.js';
export const appointmentSchema = z
  .object({
    doctorId: uuid,
    schedule: futureDate,
    reason: z.string().trim().min(2).max(500),
    note: z.string().max(1000).optional(),
  })
  .strict();
export const scheduleSchema = appointmentSchema.omit({ reason: true });
export const cancelSchema = z
  .object({ cancellationReason: z.string().trim().min(2).max(500) })
  .strict();
export const statsQuery = z.object({ from: dateTime.optional(), to: dateTime.optional() }).strict();
export const appointmentsQuery = statsQuery
  .extend({
    ...pagination,
    status: z.nativeEnum(AppointmentStatus).optional(),
    doctorId: uuid.optional(),
    patientId: uuid.optional(),
    sort: z
      .enum(['schedule', '-schedule', 'createdAt', '-createdAt', '-createdAt,schedule'])
      .default('-createdAt'),
  })
  .strict();
