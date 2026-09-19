import type { Prisma } from '@prisma/client';
import { z } from '../../utils/zod.js';
import { defined } from '../../utils/defined.js';
import { prisma, transaction } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { AppError, missing } from '../../errors/app-error.js';
import { paging, pageMeta } from '../../utils/pagination.js';
import { publicUser } from '../auth/auth.repository.js';
import { issueAccountToken } from '../auth/auth.service.js';
import { profileSchema, staffSchema, usersQuery } from './users.schema.js';
export const me = (id: string) =>
  prisma.user.findUniqueOrThrow({ where: { id }, select: publicUser });
export async function updateMe(id: string, input: z.infer<typeof profileSchema>) {
  return transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id },
      data: { ...defined(input), ...(input.phone ? { phoneVerifiedAt: null } : {}) },
      select: publicUser,
    });
    if (input.phone)
      await tx.verificationToken.updateMany({
        where: { userId: id, purpose: 'PHONE_VERIFY', consumedAt: null },
        data: { consumedAt: new Date() },
      });
    await audit(tx, id, 'UPDATE', 'User', id);
    return row;
  });
}
export async function listUsers(query: z.infer<typeof usersQuery>) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...defined({ role: query.role }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      ...paging(query),
      select: publicUser,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  return { data, meta: pageMeta(query, total) };
}
export async function inviteStaff(actorId: string, input: z.infer<typeof staffSchema>) {
  return transaction(async (tx) => {
    const user = await tx.user.create({ data: input });
    await issueAccountToken(tx, user, 'PASSWORD_RESET', true);
    await audit(tx, actorId, 'INVITE', 'User', user.id);
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUser });
  });
}
export async function changeRole(actorId: string, id: string, role: 'STAFF' | 'ADMIN') {
  return transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id, deletedAt: null } });
    if (!user) throw missing();
    if (user.role === 'PATIENT')
      throw new AppError(
        409,
        'INVALID_ROLE_CHANGE',
        'Patient and staff identities must remain separate',
      );
    if (
      user.role === 'ADMIN' &&
      role === 'STAFF' &&
      (await tx.user.count({ where: { role: 'ADMIN', deletedAt: null } })) <= 1
    )
      throw new AppError(409, 'LAST_ADMIN', 'At least one administrator is required');
    const result = await tx.user.update({
      where: { id },
      data: { role, sessionVersion: { increment: 1 } },
      select: publicUser,
    });
    await tx.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, actorId, 'CHANGE_ROLE', 'User', id);
    return result;
  });
}
