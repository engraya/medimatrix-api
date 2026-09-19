import { randomUUID } from 'node:crypto';
import { z } from '../../utils/zod.js';
import { defined } from '../../utils/defined.js';
import { missing } from '../../errors/app-error.js';
import { transaction } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { doctorsRepository } from './doctors.repository.js';
import { doctorSchema, updateDoctorSchema } from './doctors.schema.js';
export const listDoctors = doctorsRepository.list;
export async function getDoctor(id: string) {
  const row = await doctorsRepository.get(id);
  if (!row) throw missing('DOCTOR_NOT_FOUND');
  return row;
}
export async function createDoctor(actor: string, input: z.infer<typeof doctorSchema>) {
  return transaction(async (tx) => {
    const row = await tx.doctor.create({
      data: {
        ...defined(input),
        slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}`,
      },
    });
    await audit(tx, actor, 'CREATE', 'Doctor', row.id);
    return row;
  });
}
export async function updateDoctor(
  actor: string,
  id: string,
  input: z.infer<typeof updateDoctorSchema>,
) {
  return transaction(async (tx) => {
    const row = await tx.doctor.update({ where: { id }, data: defined(input) });
    await audit(tx, actor, 'UPDATE', 'Doctor', id);
    return row;
  });
}
