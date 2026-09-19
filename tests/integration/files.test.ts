import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { userFactory } from '../factories/index.js';
const app = createApp();
it('uploads a private document, limits signed URL access and supports capability download', async () => {
  const owner = await userFactory();
  const other = await userFactory();
  const bytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
  const upload = await request(app)
    .post('/api/v1/files')
    .set('Authorization', owner.authorization)
    .set('X-Requested-With', 'fetch')
    .attach('file', bytes, { filename: 'identity.pdf', contentType: 'application/pdf' })
    .expect(201);
  const id = upload.body.data.id as string;
  await request(app)
    .get(`/api/v1/files/${id}/url`)
    .set('Authorization', other.authorization)
    .expect(404);
  const signed = await request(app)
    .get(`/api/v1/files/${id}/url`)
    .set('Authorization', owner.authorization)
    .expect(200);
  const url = new URL(signed.body.data.url as string);
  await request(app)
    .get(url.pathname + url.search)
    .expect(200)
    .expect('Content-Disposition', 'attachment');
  await request(app).get(`/api/v1/files/${id}/download?token=tampered`).expect(401);
  expect(await prisma.file.count()).toBe(1);
});
it('rejects disguised content and oversized uploads without metadata', async () => {
  const owner = await userFactory();
  await request(app)
    .post('/api/v1/files')
    .set('Authorization', owner.authorization)
    .set('X-Requested-With', 'fetch')
    .attach('file', Buffer.from('MZ this is not a PDF'), {
      filename: 'fake.pdf',
      contentType: 'application/pdf',
    })
    .expect(415);
  await request(app)
    .post('/api/v1/files')
    .set('Authorization', owner.authorization)
    .set('X-Requested-With', 'fetch')
    .attach('file', Buffer.alloc(6 * 1024 * 1024), {
      filename: 'large.pdf',
      contentType: 'application/pdf',
    })
    .expect(413);
  expect(await prisma.file.count()).toBe(0);
});
