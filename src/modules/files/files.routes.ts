import { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import { requireAuth } from '../../middleware/authenticate.js';
import { upload } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { endpoint } from '../../utils/endpoint.js';
import { z, idParams } from '../../utils/zod.js';
import { registry, successSchema } from '../../docs/openapi.js';
import * as service from './files.service.js';
export const filesRouter = Router();
registry.registerPath({
  method: 'post',
  path: '/files',
  tags: ['files'],
  summary: 'Upload one private PDF/JPEG/PNG (maximum 5 MiB)',
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({ file: z.string().openapi({ type: 'string', format: 'binary' }) }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Uploaded', content: { 'application/json': { schema: successSchema } } },
  },
});
filesRouter.post(
  '/files',
  requireAuth,
  upload,
  asyncHandler(async (req, res) => {
    ok(res, await service.uploadFile(req.user!, req.file), undefined, 201);
  }),
);
endpoint(
  filesRouter,
  'get',
  '/files/:id/url',
  { tag: 'files', summary: 'Issue five-minute private download URL', params: idParams },
  async ({ actor, params }) => service.fileUrl(actor, params.id),
);
endpoint(
  filesRouter,
  'get',
  '/files/:id/download',
  {
    tag: 'files',
    summary: 'Local development signed download',
    public: true,
    params: idParams,
    query: z.object({ token: z.string().min(1).max(2048) }).strict(),
  },
  async ({ params, query, res }) => {
    const { file, stream } = await service.localDownload(params.id, query.token);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.sizeBytes);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', 'attachment');
    await pipeline(stream, res);
  },
);
