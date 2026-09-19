import { z, email, name, phone, password, uuid } from '../../utils/zod.js';
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const startSchema = z.object({ name, email, phone }).strict();
export const verifySchema = z.object({ userId: uuid, code: z.string().regex(/^\d{6}$/) }).strict();
export const forgotSchema = z.object({ email }).strict();
export const resetSchema = z.object({ token: z.string().min(32).max(200), password }).strict();
export const tokenSchema = resetSchema.pick({ token: true });
export const phoneVerifySchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
