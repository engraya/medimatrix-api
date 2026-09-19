import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);
export { z };
export const uuid = z.string().uuid();
export const phone = z.string().regex(/^\+\d{10,15}$/);
export const name = z.string().trim().min(2).max(50);
export const email = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const password = z.string().min(12).max(128);
export const dateTime = z.string().datetime({ offset: true });
export const futureDate = dateTime.refine(
  (v) => Date.parse(v) > Date.now(),
  'Must be in the future',
);
export const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const idParams = z.object({ id: uuid }).strict();
export const empty = z.object({}).strict();
