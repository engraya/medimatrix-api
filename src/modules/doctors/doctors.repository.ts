import { prisma } from '../../lib/prisma.js';
export const doctorsRepository = {
  list: (isActive: boolean) =>
    prisma.doctor.findMany({ where: { isActive }, orderBy: { name: 'asc' } }),
  get: (id: string) => prisma.doctor.findUnique({ where: { id } }),
};
