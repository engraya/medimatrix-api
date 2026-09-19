import { Gender, IdentificationType } from '@prisma/client';
import { z, name, phone, uuid, pagination } from '../../utils/zod.js';
const clinicalText = z.string().max(5000).optional();
export const patientFields = z
  .object({
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const d = new Date(v);
        return (
          !Number.isNaN(d.getTime()) &&
          d.toISOString().slice(0, 10) === v &&
          d <= new Date() &&
          d.getFullYear() >= 1900
        );
      }, 'Invalid birth date'),
    gender: z.nativeEnum(Gender),
    address: z.string().trim().min(5).max(500),
    occupation: z.string().trim().min(2).max(500),
    emergencyContactName: name,
    emergencyContactNumber: phone,
    primaryDoctorId: uuid.optional(),
    insuranceProvider: name,
    insurancePolicyNumber: name,
    allergies: clinicalText,
    currentMedication: clinicalText,
    familyMedicalHistory: clinicalText,
    pastMedicalHistory: clinicalText,
    identificationType: z.nativeEnum(IdentificationType).optional(),
    identificationNumber: z.string().min(2).max(100).optional(),
    identificationDocumentId: uuid.optional(),
  })
  .strict();
export const registerSchema = patientFields.extend({
  treatmentConsent: z.literal(true),
  disclosureConsent: z.literal(true),
  privacyConsent: z.literal(true),
});
export const updatePatientSchema = patientFields.partial();
export const patientsQuery = z
  .object({
    ...pagination,
    q: z.string().max(100).optional(),
    sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
  })
  .strict();
