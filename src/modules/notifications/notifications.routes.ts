import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { ok } from '../../utils/response.js';
import { idParams } from '../../utils/zod.js';
import { inboxQuery, preferencesSchema } from './notifications.schema.js';
import * as service from './inbox.service.js';
export const notificationsRouter = Router();
endpoint(
  notificationsRouter,
  'get',
  '/notifications',
  { tag: 'notifications', summary: 'My notification inbox', query: inboxQuery },
  async ({ actor, query, res }) => {
    const result = await service.inbox(actor.id, query);
    ok(res, result.data, result.meta);
  },
);
endpoint(
  notificationsRouter,
  'get',
  '/notifications/preferences',
  { tag: 'notifications', summary: 'My notification preferences' },
  async ({ actor }) => service.preferences(actor.id),
);
endpoint(
  notificationsRouter,
  'put',
  '/notifications/preferences',
  {
    tag: 'notifications',
    summary: 'Update preferences (authentication messages remain mandatory)',
    body: preferencesSchema,
  },
  async ({ actor, body }) => service.updatePreferences(actor.id, body),
);
endpoint(
  notificationsRouter,
  'post',
  '/notifications/read-all',
  { tag: 'notifications', summary: 'Mark inbox read' },
  async ({ actor }) => service.readAll(actor.id),
);
endpoint(
  notificationsRouter,
  'patch',
  '/notifications/:id/read',
  { tag: 'notifications', summary: 'Mark notification read', params: idParams },
  async ({ actor, params }) => service.markRead(actor.id, params.id),
);
