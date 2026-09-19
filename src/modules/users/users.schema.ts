import { UserRole } from '@prisma/client';
import { z, email, name, phone, pagination } from '../../utils/zod.js';
export const profileSchema = z.object({ name: name.optional(), phone: phone.optional() }).strict();
export const staffSchema = z
  .object({ name, email, phone, role: z.enum(['STAFF', 'ADMIN']) })
  .strict();
export const roleSchema = z.object({ role: z.enum(['STAFF', 'ADMIN']) }).strict();
export const usersQuery = z
  .object({
    ...pagination,
    role: z.nativeEnum(UserRole).optional(),
    q: z.string().max(100).optional(),
  })
  .strict();
