import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { idParams } from '../../utils/zod.js';
import { ok } from '../../utils/response.js';
import * as schema from './users.schema.js';
import * as service from './users.service.js';
export const usersRouter = Router();
endpoint(
  usersRouter,
  'get',
  '/users/me',
  { tag: 'users', summary: 'My profile' },
  async ({ actor }) => service.me(actor.id),
);
endpoint(
  usersRouter,
  'patch',
  '/users/me',
  { tag: 'users', summary: 'Update my profile', body: schema.profileSchema },
  async ({ actor, body }) => service.updateMe(actor.id, body),
);
endpoint(
  usersRouter,
  'get',
  '/users',
  { tag: 'users', summary: 'Search users', roles: ['ADMIN'], query: schema.usersQuery },
  async ({ query, res }) => {
    const result = await service.listUsers(query);
    ok(res, result.data, result.meta);
  },
);
endpoint(
  usersRouter,
  'post',
  '/users/staff',
  {
    tag: 'users',
    summary: 'Invite staff',
    roles: ['ADMIN'],
    body: schema.staffSchema,
    status: 201,
  },
  async ({ actor, body }) => service.inviteStaff(actor.id, body),
);
endpoint(
  usersRouter,
  'patch',
  '/users/:id/role',
  {
    tag: 'users',
    summary: 'Change staff role',
    roles: ['ADMIN'],
    body: schema.roleSchema,
    params: idParams,
  },
  async ({ actor, body, params }) => service.changeRole(actor.id, params.id, body.role),
);
