import type { Prisma } from '@prisma/client';
import { z } from '../../utils/zod.js';
import { defined } from '../../utils/defined.js';
import { transaction } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { AppError, missing, forbidden } from '../../errors/app-error.js';
import { paging, pageMeta } from '../../utils/pagination.js';
import { type Actor, patientsRepository } from '../patients/patients.repository.js';
import { enqueue } from '../notifications/notifications.service.js';
import { appointmentMessage } from '../notifications/templates/appointment.js';
import { appointmentScope, appointmentInclude } from './appointments.repository.js';
import { assertTransition } from './appointment-state.js';
import {
  appointmentSchema,
  appointmentsQuery,
  scheduleSchema,
  cancelSchema,
  statsQuery,
} from './appointments.schema.js';

export async function createAppointment(actor: Actor, input: z.infer<typeof appointmentSchema>) {
  return transaction(async (tx) => {
    const patient = await patientsRepository.mine(actor.id, tx);
    if (!patient) throw new AppError(409, 'NOT_REGISTERED', 'Register before booking');
    if (!(await tx.doctor.findFirst({ where: { id: input.doctorId, isActive: true } })))
      throw missing('DOCTOR_NOT_FOUND');
    const row = await tx.appointment.create({
      data: {
        ...defined(input),
        schedule: new Date(input.schedule),
        patientId: patient.id,
        status: 'PENDING',
      },
      include: appointmentInclude,
    });
    await audit(tx, actor.id, 'CREATE', 'Appointment', row.id);
    const staff = await tx.user.findMany({
      where: { role: { in: ['STAFF', 'ADMIN'] }, deletedAt: null },
      select: { id: true },
    });
    for (const user of staff)
      await enqueue(tx, {
        userId: user.id,
        type: 'APPOINTMENT_REQUESTED',
        title: 'Appointment requested',
        body: 'A patient has requested an appointment. Review it in the dashboard.',
        key: row.id,
        channels: ['IN_APP'],
      });
    return row;
  });
}
function dateFilter(query: z.infer<typeof statsQuery>) {
  if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to))
    throw new AppError(400, 'VALIDATION_ERROR', 'from must be before to');
  return {
    ...(query.from ? { gte: new Date(query.from) } : {}),
    ...(query.to ? { lte: new Date(query.to) } : {}),
  };
}
export async function listAppointments(actor: Actor, query: z.infer<typeof appointmentsQuery>) {
  return transaction(async (tx) => {
    const where: Prisma.AppointmentWhereInput = {
      ...appointmentScope(actor),
      ...defined({ status: query.status, doctorId: query.doctorId, patientId: query.patientId }),
      schedule: dateFilter(query),
    };
    const orderBy: Prisma.AppointmentOrderByWithRelationInput[] = query.sort
      .split(',')
      .map((part) => ({ [part.replace(/^-/, '')]: part.startsWith('-') ? 'desc' : 'asc' }));
    const [data, total] = await Promise.all([
      tx.appointment.findMany({
        where,
        ...paging(query),
        include: appointmentInclude,
        orderBy: [...orderBy, { id: 'asc' }],
      }),
      tx.appointment.count({ where }),
    ]);
    if (actor.role !== 'PATIENT')
      for (const row of data) await audit(tx, actor.id, 'READ', 'Appointment', row.id);
    return { data, meta: pageMeta(query, total) };
  });
}
export async function getAppointment(actor: Actor, id: string) {
  return transaction(async (tx) => {
    const row = await tx.appointment.findFirst({
      where: { id, ...appointmentScope(actor) },
      include: appointmentInclude,
    });
    if (!row) throw missing();
    if (actor.role !== 'PATIENT') await audit(tx, actor.id, 'READ', 'Appointment', row.id);
    return row;
  });
}
export async function scheduleAppointment(
  actor: Actor,
  id: string,
  input: z.infer<typeof scheduleSchema>,
) {
  if (actor.role === 'PATIENT') throw forbidden();
  return transaction(async (tx) => {
    const current = await tx.appointment.findFirst({ where: { id, ...appointmentScope(actor) } });
    if (!current) throw missing();
    assertTransition(current.status, 'SCHEDULED');
    if (!(await tx.doctor.findFirst({ where: { id: input.doctorId, isActive: true } })))
      throw missing('DOCTOR_NOT_FOUND');
    const row = await tx.appointment.update({
      where: { id },
      data: {
        ...defined(input),
        schedule: new Date(input.schedule),
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        scheduledById: actor.id,
      },
      include: appointmentInclude,
    });
    await audit(tx, actor.id, 'SCHEDULE', 'Appointment', id);
    await enqueue(tx, {
      userId: row.patient.userId,
      type: 'APPOINTMENT_SCHEDULED',
      title: 'Appointment confirmed',
      body: appointmentMessage('SCHEDULED', row.schedule, row.doctor.name),
      key: `${id}:${row.updatedAt.toISOString()}`,
    });
    return row;
  });
}
export async function cancelAppointment(
  actor: Actor,
  id: string,
  input: z.infer<typeof cancelSchema>,
) {
  return transaction(async (tx) => {
    const current = await tx.appointment.findFirst({ where: { id, ...appointmentScope(actor) } });
    if (!current) throw missing();
    if (actor.role === 'PATIENT' && current.status !== 'PENDING') throw forbidden();
    assertTransition(current.status, 'CANCELLED');
    const row = await tx.appointment.update({
      where: { id },
      data: { ...input, status: 'CANCELLED', cancelledAt: new Date(), cancelledById: actor.id },
      include: appointmentInclude,
    });
    await audit(tx, actor.id, 'CANCEL', 'Appointment', id);
    await enqueue(tx, {
      userId: row.patient.userId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Appointment cancelled',
      body: appointmentMessage(
        'CANCELLED',
        row.schedule,
        row.doctor.name,
        input.cancellationReason,
      ),
      key: id,
    });
    return row;
  });
}
export async function appointmentStats(query: z.infer<typeof statsQuery>) {
  return transaction(async (tx) => {
    const groups = await tx.appointment.groupBy({
      by: ['status'],
      where: { schedule: dateFilter(query), patient: { deletedAt: null } },
      _count: { _all: true },
    });
    const result = { total: 0, pending: 0, scheduled: 0, cancelled: 0 };
    for (const group of groups) {
      result.total += group._count._all;
      result[group.status.toLowerCase() as 'pending' | 'scheduled' | 'cancelled'] =
        group._count._all;
    }
    return result;
  });
}
