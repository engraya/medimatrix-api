import type { Prisma } from '@prisma/client';
import { z } from '../../utils/zod.js';
import { defined } from '../../utils/defined.js';
import { transaction, type Transaction } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { AppError, missing, forbidden } from '../../errors/app-error.js';
import { paging, pageMeta } from '../../utils/pagination.js';
import { publicUser } from '../auth/auth.repository.js';
import { enqueue } from '../notifications/notifications.service.js';
import { patientsRepository, type Actor } from './patients.repository.js';
import { registerSchema, updatePatientSchema, patientsQuery } from './patients.schema.js';

async function checkReferences(
  tx: Transaction,
  ownerId: string,
  data: { identificationDocumentId?: string | undefined; primaryDoctorId?: string | undefined },
) {
  if (data.identificationDocumentId) {
    const file = await tx.file.findUnique({ where: { id: data.identificationDocumentId } });
    if (!file || file.ownerUserId !== ownerId) throw forbidden();
  }
  if (
    data.primaryDoctorId &&
    !(await tx.doctor.findFirst({ where: { id: data.primaryDoctorId, isActive: true } }))
  )
    throw missing('DOCTOR_NOT_FOUND');
}
export async function registerPatient(actor: Actor, input: z.infer<typeof registerSchema>) {
  return transaction(async (tx) => {
    if (await tx.patient.findUnique({ where: { userId: actor.id } }))
      throw new AppError(409, 'ALREADY_REGISTERED', 'Patient already registered');
    await checkReferences(tx, actor.id, input);
    const {
      treatmentConsent: _t,
      disclosureConsent: _d,
      privacyConsent: _p,
      birthDate,
      ...fields
    } = input;
    const now = new Date();
    const patient = await tx.patient.create({
      data: {
        ...defined(fields),
        userId: actor.id,
        birthDate: new Date(birthDate),
        treatmentConsentAt: now,
        disclosureConsentAt: now,
        privacyConsentAt: now,
      },
    });
    await audit(tx, actor.id, 'REGISTER', 'Patient', patient.id);
    await enqueue(tx, {
      userId: actor.id,
      type: 'WELCOME',
      title: 'Welcome to MediMatrix',
      body: 'Your registration is complete. You can now request an appointment.',
      key: patient.id,
      channels: ['IN_APP', 'EMAIL'],
    });
    return patient;
  });
}
export async function getPatient(actor: Actor, id?: string) {
  return transaction(async (tx) => {
    const row = id
      ? await patientsRepository.byId(actor, id, tx)
      : await patientsRepository.mine(actor.id, tx);
    if (!row) throw missing('NOT_REGISTERED');
    if (actor.role !== 'PATIENT') await audit(tx, actor.id, 'READ', 'Patient', row.id);
    return row;
  });
}
export async function updatePatient(
  actor: Actor,
  id: string,
  input: z.infer<typeof updatePatientSchema>,
) {
  return transaction(async (tx) => {
    const row = await patientsRepository.byId(actor, id, tx);
    if (!row) throw missing();
    await checkReferences(tx, row.userId, input);
    const { birthDate, ...fields } = input;
    const patient = await tx.patient.update({
      where: { id },
      data: { ...defined(fields), ...(birthDate ? { birthDate: new Date(birthDate) } : {}) },
    });
    await audit(tx, actor.id, 'UPDATE', 'Patient', id);
    return patient;
  });
}
export async function listPatients(actor: Actor, query: z.infer<typeof patientsQuery>) {
  return transaction(async (tx) => {
    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
      ...(query.q
        ? {
            user: {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      tx.patient.findMany({
        where,
        ...paging(query),
        orderBy: { createdAt: query.sort === 'createdAt' ? 'asc' : 'desc' },
        include: { user: { select: publicUser } },
      }),
      tx.patient.count({ where }),
    ]);
    for (const row of data) await audit(tx, actor.id, 'READ', 'Patient', row.id);
    return { data, meta: pageMeta(query, total) };
  });
}
