import type { Prisma } from '@prisma/client';
import type { Actor } from '../patients/patients.repository.js';
export const appointmentScope = (actor: Actor): Prisma.AppointmentWhereInput => ({
  patient: { deletedAt: null, ...(actor.role === 'PATIENT' ? { userId: actor.id } : {}) },
});
export const appointmentInclude = {
  doctor: { select: { id: true, name: true, imageUrl: true, specialty: true } },
  patient: { select: { id: true, userId: true, user: { select: { id: true, name: true } } } },
} as const;
