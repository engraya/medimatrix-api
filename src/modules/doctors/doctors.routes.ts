import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { idParams } from '../../utils/zod.js';
import { doctorSchema, updateDoctorSchema, doctorQuery } from './doctors.schema.js';
import * as service from './doctors.service.js';
export const doctorsRouter = Router();
endpoint(
  doctorsRouter,
  'get',
  '/doctors',
  { tag: 'doctors', summary: 'List doctors', public: true, query: doctorQuery },
  async ({ query }) => service.listDoctors(query.active),
);
endpoint(
  doctorsRouter,
  'get',
  '/doctors/:id',
  { tag: 'doctors', summary: 'Get doctor', public: true, params: idParams },
  async ({ params }) => service.getDoctor(params.id),
);
endpoint(
  doctorsRouter,
  'post',
  '/doctors',
  { tag: 'doctors', summary: 'Create doctor', roles: ['ADMIN'], body: doctorSchema, status: 201 },
  async ({ actor, body }) => service.createDoctor(actor.id, body),
);
endpoint(
  doctorsRouter,
  'patch',
  '/doctors/:id',
  {
    tag: 'doctors',
    summary: 'Update doctor',
    roles: ['ADMIN'],
    body: updateDoctorSchema,
    params: idParams,
  },
  async ({ actor, body, params }) => service.updateDoctor(actor.id, params.id, body),
);
endpoint(
  doctorsRouter,
  'delete',
  '/doctors/:id',
  { tag: 'doctors', summary: 'Deactivate doctor', roles: ['ADMIN'], params: idParams },
  async ({ actor, params }) => service.updateDoctor(actor.id, params.id, { isActive: false }),
);
