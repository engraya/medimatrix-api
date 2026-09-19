import type { AppointmentStatus } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
export function assertTransition(from: AppointmentStatus, to: 'SCHEDULED' | 'CANCELLED') {
  if (from === 'CANCELLED' || !['SCHEDULED', 'CANCELLED'].includes(to))
    throw new AppError(409, 'INVALID_TRANSITION', 'Cancelled appointments cannot be changed');
}
