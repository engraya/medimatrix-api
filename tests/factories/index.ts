import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/lib/prisma.js';
import { session } from '../../src/modules/auth/token.service.js';
import type { UserRole } from '@prisma/client';
let count = 0;
export async function userFactory(role: UserRole = 'PATIENT') {
  count++;
  const user = await prisma.user.create({
    data: {
      name: 'Test Person',
      email: `${randomUUID()}@example.com`,
      phone: `+23480${String(count).padStart(8, '0')}`,
      role,
      emailVerifiedAt: new Date(),
    },
  });
  const tokens = await prisma.$transaction((tx) => session(tx, user));
  return { user, tokens, authorization: `Bearer ${tokens.accessToken}` };
}
export const doctorFactory = () =>
  prisma.doctor.create({
    data: { name: 'John Green', slug: randomUUID(), imageUrl: '/assets/images/dr-john.png' },
  });
export const registration = {
  birthDate: '1994-04-02',
  gender: 'OTHER',
  address: '12 Example Road',
  occupation: 'Engineer',
  emergencyContactName: 'Test Contact',
  emergencyContactNumber: '+2348012345678',
  insuranceProvider: 'Example Insurer',
  insurancePolicyNumber: 'POLICY-123',
  treatmentConsent: true,
  disclosureConsent: true,
  privacyConsent: true,
};
