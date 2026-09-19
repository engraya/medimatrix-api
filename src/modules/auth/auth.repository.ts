import { prisma } from '../../lib/prisma.js';
import type { Transaction } from '../../lib/prisma.js';
export const publicUser = {
  id: true,
  email: true,
  phone: true,
  name: true,
  role: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
export const identityRepository = {
  byId: (id: string, tx: Transaction = prisma) => tx.user.findUnique({ where: { id } }),
  byEmail: (email: string, tx: Transaction = prisma) => tx.user.findUnique({ where: { email } }),
  profile: (id: string) =>
    prisma.user.findUniqueOrThrow({
      where: { id },
      select: { ...publicUser, patient: { select: { id: true } } },
    }),
};
