import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
export const opaqueToken = () => randomBytes(32).toString('base64url');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashCode = (value: string) =>
  createHmac('sha256', env.OTP_PEPPER).update(value).digest('hex');
export function equalHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function durationMs(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('Invalid duration');
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]!]!;
}
