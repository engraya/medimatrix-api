import { prisma } from '../../lib/prisma.js';
export const filesRepository = { byId: (id: string) => prisma.file.findUnique({ where: { id } }) };
