import { randomInt, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { User, VerificationPurpose } from '@prisma/client';
import { z } from '../../utils/zod.js';
import { prisma, transaction, type Transaction } from '../../lib/prisma.js';
import { AppError, unauthorized } from '../../errors/app-error.js';
import { hashCode, equalHash, hashToken, opaqueToken } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS } from '../../config/constants.js';
import { identityRepository } from './auth.repository.js';
import { session } from './token.service.js';
import { enqueue } from '../notifications/notifications.service.js';
import { loginSchema, startSchema, verifySchema } from './auth.schema.js';

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
let dummyHash: Promise<string> | undefined;
export async function login(input: z.infer<typeof loginSchema>) {
  const user = await identityRepository.byEmail(input.email);
  dummyHash ??= hashPassword(randomUUID());
  const valid = await argon2.verify(user?.passwordHash ?? (await dummyHash), input.password);
  const result = await transaction(async (tx) => {
    if (!user) return { error: unauthorized('INVALID_CREDENTIALS') };
    const current = await identityRepository.byId(user.id, tx);
    if (!current || current.deletedAt || current.role === 'PATIENT')
      return { error: unauthorized('INVALID_CREDENTIALS') };
    if (current.lockedUntil && current.lockedUntil > new Date())
      return { error: new AppError(423, 'LOCKED', 'Account temporarily locked') };
    if (!valid || current.passwordHash !== user.passwordHash) {
      const newWindow =
        !current.loginWindowAt || Date.now() - current.loginWindowAt.getTime() > 900000;
      const failures = newWindow ? 1 : current.loginFailures + 1;
      await tx.user.update({
        where: { id: current.id },
        data: {
          loginFailures: failures,
          loginWindowAt: newWindow ? new Date() : current.loginWindowAt,
          lockedUntil: failures >= 10 ? new Date(Date.now() + 900000) : null,
        },
      });
      return { error: unauthorized('INVALID_CREDENTIALS') };
    }
    await tx.user.update({
      where: { id: current.id },
      data: { loginFailures: 0, lockedUntil: null, loginWindowAt: null },
    });
    return { tokens: await session(tx, current), userId: current.id };
  });
  if (result.error) throw result.error;
  return { tokens: result.tokens!, user: await identityRepository.profile(result.userId!) };
}
export async function refresh(raw: unknown) {
  if (typeof raw !== 'string') throw unauthorized('REFRESH_INVALID');
  const result = await transaction(async (tx) => {
    const row = await tx.refreshToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: true },
    });
    if (!row) return { error: true };
    if (row.revokedAt) {
      await tx.refreshToken.updateMany({
        where: { familyId: row.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.update({
        where: { id: row.userId },
        data: { sessionVersion: { increment: 1 } },
      });
      return { error: true };
    }
    if (row.expiresAt < new Date() || row.user.deletedAt) return { error: true };
    const tokens = await session(tx, row.user, row.familyId);
    await tx.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedById: tokens.refreshId },
    });
    return { tokens, userId: row.userId };
  });
  if (result.error) throw unauthorized('REFRESH_INVALID');
  return { tokens: result.tokens!, user: await identityRepository.profile(result.userId!) };
}
export async function logout(raw: unknown) {
  if (typeof raw === 'string')
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  return null;
}
export async function startPatient(input: z.infer<typeof startSchema>) {
  return transaction(async (tx) => {
    let user = await identityRepository.byEmail(input.email, tx);
    if (user && (user.role !== 'PATIENT' || user.deletedAt))
      throw new AppError(400, 'INVALID_ACCOUNT', 'Cannot start patient authentication');
    // Existing identity contact details are never replaced by an unauthenticated request.
    if (!user) user = await tx.user.create({ data: input });
    const recent = await tx.verificationToken.count({
      where: {
        userId: user.id,
        purpose: 'LOGIN_OTP',
        createdAt: { gte: new Date(Date.now() - 900000) },
      },
    });
    if (recent >= 3) throw new AppError(429, 'RATE_LIMITED', 'Too many codes requested');
    await tx.verificationToken.updateMany({
      where: { userId: user.id, purpose: 'LOGIN_OTP', consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const code = randomInt(100000, 1000000).toString();
    const token = await tx.verificationToken.create({
      data: {
        userId: user.id,
        purpose: 'LOGIN_OTP',
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // Send to the stored email so a changed/recycled phone cannot seize an account.
    await enqueue(tx, {
      userId: user.id,
      type: 'OTP',
      title: 'Your MediMatrix code',
      body: `Your verification code is ${code}. It expires in 10 minutes.`,
      key: token.id,
      channels: ['EMAIL'],
      sensitive: true,
    });
    const patient = await tx.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return { userId: user.id, channel: 'EMAIL', registered: Boolean(patient) };
  });
}
export async function verifyOtp(input: z.infer<typeof verifySchema>) {
  const result = await transaction(async (tx) => {
    const token = await tx.verificationToken.findFirst({
      where: { userId: input.userId, purpose: 'LOGIN_OTP', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.expiresAt < new Date())
      return { error: new AppError(410, 'OTP_EXPIRED', 'Code expired; request a new code') };
    if (token.attempts >= OTP_MAX_ATTEMPTS)
      return { error: new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Request a new code') };
    await tx.verificationToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    if (!equalHash(token.codeHash, hashCode(input.code)))
      return { error: unauthorized('OTP_INVALID') };
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user || user.deletedAt || user.role !== 'PATIENT') return { error: unauthorized() };
    await tx.verificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    return { tokens: await session(tx, user), userId: user.id };
  });
  if (result.error) throw result.error;
  return { tokens: result.tokens!, user: await identityRepository.profile(result.userId!) };
}
export async function issueAccountToken(
  tx: Transaction,
  user: User,
  purpose: Extract<VerificationPurpose, 'EMAIL_VERIFY' | 'PASSWORD_RESET'>,
  invite = false,
) {
  const raw = opaqueToken();
  await tx.verificationToken.updateMany({
    where: { userId: user.id, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const token = await tx.verificationToken.create({
    data: {
      userId: user.id,
      purpose,
      codeHash: hashToken(raw),
      expiresAt: new Date(Date.now() + (purpose === 'EMAIL_VERIFY' ? 86400000 : 1800000)),
    },
  });
  const page = purpose === 'EMAIL_VERIFY' ? 'verify-email' : 'reset-password';
  const url = `${env.FRONTEND_URL}/${page}#token=${encodeURIComponent(raw)}`;
  await enqueue(tx, {
    userId: user.id,
    type: invite
      ? 'STAFF_INVITE'
      : purpose === 'EMAIL_VERIFY'
        ? 'EMAIL_VERIFICATION'
        : 'PASSWORD_RESET',
    title: invite ? 'Your MediMatrix invitation' : 'MediMatrix account verification',
    body: `Open this link to continue: ${url}`,
    key: token.id,
    channels: ['EMAIL'],
    sensitive: true,
  });
}
export async function forgotPassword(email: string) {
  await transaction(async (tx) => {
    const user = await identityRepository.byEmail(email, tx);
    if (user && !user.deletedAt && user.role !== 'PATIENT')
      await issueAccountToken(tx, user, 'PASSWORD_RESET');
  });
  return null;
}
export async function consumeAccountToken(
  raw: string,
  purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
  password?: string,
) {
  const passwordHash = password ? await hashPassword(password) : undefined;
  await transaction(async (tx) => {
    const token = await tx.verificationToken.findFirst({
      where: {
        codeHash: hashToken(raw),
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
    });
    if (!token) throw new AppError(410, 'TOKEN_EXPIRED', 'Token is invalid or expired');
    await tx.verificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
    await tx.user.update({
      where: { id: token.userId },
      data: {
        emailVerifiedAt: new Date(),
        ...(passwordHash
          ? { passwordHash, sessionVersion: { increment: 1 }, loginFailures: 0, lockedUntil: null }
          : {}),
      },
    });
    if (passwordHash)
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
  });
  return null;
}

export async function startPhoneVerification(userId: string) {
  await transaction(async (tx) => {
    const user = await identityRepository.byId(userId, tx);
    if (!user || user.deletedAt) throw unauthorized();
    const recent = await tx.verificationToken.count({
      where: { userId, purpose: 'PHONE_VERIFY', createdAt: { gte: new Date(Date.now() - 900000) } },
    });
    if (recent >= 3) throw new AppError(429, 'RATE_LIMITED', 'Too many codes requested');
    await tx.verificationToken.updateMany({
      where: { userId, purpose: 'PHONE_VERIFY', consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const code = randomInt(100000, 1000000).toString();
    const token = await tx.verificationToken.create({
      data: {
        userId,
        purpose: 'PHONE_VERIFY',
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    await enqueue(tx, {
      userId,
      type: 'OTP',
      title: 'Verify your phone',
      body: `Your MediMatrix phone verification code is ${code}. It expires in 10 minutes.`,
      key: token.id,
      channels: ['SMS'],
      sensitive: true,
    });
  });
  return { channel: 'SMS' };
}

export async function verifyPhone(userId: string, code: string) {
  const error = await transaction(async (tx) => {
    const token = await tx.verificationToken.findFirst({
      where: { userId, purpose: 'PHONE_VERIFY', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.expiresAt < new Date())
      return new AppError(410, 'OTP_EXPIRED', 'Code expired; request a new code');
    if (token.attempts >= OTP_MAX_ATTEMPTS)
      return new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Request a new code');
    await tx.verificationToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    if (!equalHash(token.codeHash, hashCode(code))) return unauthorized('OTP_INVALID');
    await tx.verificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
    await tx.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } });
    return null;
  });
  if (error) throw error;
  return null;
}
