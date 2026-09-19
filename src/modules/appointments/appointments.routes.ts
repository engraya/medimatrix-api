import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { idParams } from '../../utils/zod.js';
import { ok } from '../../utils/response.js';
import * as schemas from './appointments.schema.js';
import * as service from './appointments.service.js';
export const appointmentsRouter = Router();
endpoint(
  appointmentsRouter,
  'post',
  '/appointments',
  {
    tag: 'appointments',
    summary: 'Request appointment',
    roles: ['PATIENT'],
    body: schemas.appointmentSchema,
    status: 201,
  },
  async ({ actor, body }) => service.createAppointment(actor, body),
);
endpoint(
  appointmentsRouter,
  'get',
  '/appointments',
  { tag: 'appointments', summary: 'List scoped appointments', query: schemas.appointmentsQuery },
  async ({ actor, query, res }) => {
    const result = await service.listAppointments(actor, query);
    ok(res, result.data, result.meta);
  },
);
endpoint(
  appointmentsRouter,
  'get',
  '/appointments/stats',
  {
    tag: 'appointments',
    summary: 'Dashboard totals',
    roles: ['STAFF', 'ADMIN'],
    query: schemas.statsQuery,
  },
  async ({ query }) => service.appointmentStats(query),
);
endpoint(
  appointmentsRouter,
  'get',
  '/appointments/:id',
  { tag: 'appointments', summary: 'Get appointment', params: idParams },
  async ({ actor, params }) => service.getAppointment(actor, params.id),
);
endpoint(
  appointmentsRouter,
  'patch',
  '/appointments/:id/schedule',
  {
    tag: 'appointments',
    summary: 'Schedule or reschedule appointment',
    roles: ['STAFF', 'ADMIN'],
    params: idParams,
    body: schemas.scheduleSchema,
  },
  async ({ actor, params, body }) => service.scheduleAppointment(actor, params.id, body),
);
endpoint(
  appointmentsRouter,
  'patch',
  '/appointments/:id/cancel',
  {
    tag: 'appointments',
    summary: 'Cancel appointment',
    params: idParams,
    body: schemas.cancelSchema,
  },
  async ({ actor, params, body }) => service.cancelAppointment(actor, params.id, body),
);
