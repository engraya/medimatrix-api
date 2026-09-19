import { it, expect } from 'vitest';
import { registerSchema } from '../../src/modules/patients/patients.schema.js';
import {
  appointmentSchema,
  cancelSchema,
} from '../../src/modules/appointments/appointments.schema.js';
import { loadEnv } from '../../src/config/env.js';
const fields = {
  birthDate: '1990-02-12',
  gender: 'OTHER',
  address: '123 Main Street',
  occupation: 'Engineer',
  emergencyContactName: 'Jane Doe',
  emergencyContactNumber: '+2348012345678',
  insuranceProvider: 'Insurance Inc',
  insurancePolicyNumber: '123456',
  treatmentConsent: true,
  disclosureConsent: true,
  privacyConsent: true,
};
it('requires each consent and rejects impossible birth dates', () => {
  expect(registerSchema.safeParse(fields).success).toBe(true);
  for (const consent of ['treatmentConsent', 'disclosureConsent', 'privacyConsent'])
    expect(registerSchema.safeParse({ ...fields, [consent]: false }).success).toBe(false);
  expect(registerSchema.safeParse({ ...fields, birthDate: '2000-02-31' }).success).toBe(false);
});
it('does not accept client-controlled booking state', () => {
  expect(
    appointmentSchema.safeParse({
      doctorId: '26d48cce-d8fb-457f-a731-e42ff17aeb46',
      schedule: '2099-01-01T10:00:00Z',
      reason: 'Checkup',
      status: 'SCHEDULED',
    }).success,
  ).toBe(false);
});
it('requires a meaningful cancellation reason', () => {
  expect(cancelSchema.safeParse({ cancellationReason: ' ' }).success).toBe(false);
});
it('reports configuration keys and escapes database credentials', () => {
  expect(() => loadEnv({ ...process.env, PORT: 'abc' })).toThrow('PORT');
  expect(loadEnv({ ...process.env, POSTGRES_PASSWORD: 'a@b:c' }).DATABASE_URL).toContain(
    'a%40b%3Ac',
  );
  expect(() => loadEnv({ ...process.env, JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
});
