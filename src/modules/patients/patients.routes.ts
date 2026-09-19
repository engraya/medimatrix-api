import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { ok } from '../../utils/response.js';
import { idParams } from '../../utils/zod.js';
import { registerSchema, updatePatientSchema, patientsQuery } from './patients.schema.js';
import * as service from './patients.service.js';
export const patientsRouter = Router();
endpoint(
  patientsRouter,
  'post',
  '/patients',
  {
    tag: 'patients',
    summary: 'Register patient',
    roles: ['PATIENT'],
    body: registerSchema,
    status: 201,
  },
  async ({ actor, body }) => service.registerPatient(actor, body),
);
endpoint(
  patientsRouter,
  'get',
  '/patients/me',
  { tag: 'patients', summary: 'My patient profile', roles: ['PATIENT'] },
  async ({ actor }) => service.getPatient(actor),
);
endpoint(
  patientsRouter,
  'get',
  '/patients',
  { tag: 'patients', summary: 'Search patients', roles: ['STAFF', 'ADMIN'], query: patientsQuery },
  async ({ actor, query, res }) => {
    const result = await service.listPatients(actor, query);
    ok(res, result.data, result.meta);
  },
);
endpoint(
  patientsRouter,
  'get',
  '/patients/:id',
  { tag: 'patients', summary: 'Get patient', params: idParams },
  async ({ actor, params }) => service.getPatient(actor, params.id),
);
endpoint(
  patientsRouter,
  'patch',
  '/patients/:id',
  { tag: 'patients', summary: 'Update patient', params: idParams, body: updatePatientSchema },
  async ({ actor, params, body }) => service.updatePatient(actor, params.id, body),
);
