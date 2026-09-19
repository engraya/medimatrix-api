import type { Request, Response, Router } from 'express';
import type { UserRole } from '@prisma/client';
import { z, empty } from './zod.js';
import { asyncHandler } from './async-handler.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { registry, successSchema, errorSchema } from '../docs/openapi.js';
import { ok } from './response.js';

export interface Context<B, Q, P> {
  body: B;
  query: Q;
  params: P;
  req: Request;
  res: Response;
  actor: { id: string; role: UserRole };
}
export function endpoint<
  B extends z.ZodTypeAny = typeof empty,
  Q extends z.ZodTypeAny = typeof empty,
  P extends z.ZodTypeAny = typeof empty,
>(
  router: Router,
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  options: {
    tag: string;
    summary: string;
    public?: boolean;
    roles?: UserRole[];
    body?: B;
    query?: Q;
    params?: P;
    status?: number;
  },
  handler: (context: Context<z.output<B>, z.output<Q>, z.output<P>>) => Promise<unknown>,
) {
  const bodySchema = options.body ?? empty;
  const querySchema = options.query ?? empty;
  const paramsSchema = options.params ?? empty;
  registry.registerPath({
    method,
    path: path.replace(/:(\w+)/g, '{$1}'),
    tags: [options.tag],
    summary: options.summary,
    ...(options.public ? {} : { security: [{ cookieAuth: [] }, { bearerAuth: [] }] }),
    request: {
      params: paramsSchema as z.AnyZodObject,
      query: querySchema as z.AnyZodObject,
      ...(options.body
        ? { body: { content: { 'application/json': { schema: bodySchema } } } }
        : {}),
    },
    responses: {
      [options.status ?? 200]: {
        description: 'Success',
        content: { 'application/json': { schema: successSchema } },
      },
      default: { description: 'Error', content: { 'application/json': { schema: errorSchema } } },
    },
  });
  router[method](
    path,
    ...(options.public ? [] : [requireAuth]),
    ...(options.roles ? [requireRole(...options.roles)] : []),
    asyncHandler(async (req, res) => {
      const body = bodySchema.parse(req.body ?? {});
      const query = querySchema.parse(req.query);
      const params = paramsSchema.parse(req.params);
      const result = await handler({
        body,
        query,
        params,
        req,
        res,
        actor: req.user ?? { id: '', role: 'PATIENT' },
      });
      if (!res.headersSent) ok(res, result, undefined, options.status ?? 200);
    }),
  );
}
