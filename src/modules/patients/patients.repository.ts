import type { Prisma } from '@prisma/client';
import { prisma, type Transaction } from '../../lib/prisma.js';
export type Actor = { id: string; role: 'PATIENT' | 'STAFF' | 'ADMIN' };
export const patientScope = (actor: Actor): Prisma.PatientWhereInput => ({
  deletedAt: null,
  ...(actor.role === 'PATIENT' ? { userId: actor.id } : {}),
});
export const patientsRepository = {
  mine: (userId: string, tx: Transaction = prisma) =>
    tx.patient.findFirst({ where: { userId, deletedAt: null } }),
  byId: (actor: Actor, id: string, tx: Transaction = prisma) =>
    tx.patient.findFirst({ where: { id, ...patientScope(actor) } }),
};
