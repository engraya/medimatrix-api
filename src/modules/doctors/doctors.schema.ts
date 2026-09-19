import { z, name, booleanQuery } from '../../utils/zod.js';
export const doctorSchema = z
  .object({
    name,
    imageUrl: z.string().url().max(2048),
    specialty: z.string().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateDoctorSchema = doctorSchema.partial();
export const doctorQuery = z.object({ active: booleanQuery.default('true') }).strict();
