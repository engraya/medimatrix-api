import { prisma } from '../../lib/prisma.js';
export const pingDatabase = () => prisma.$queryRaw`SELECT 1`;
