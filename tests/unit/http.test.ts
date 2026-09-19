import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
const app = createApp();
it('returns liveness with request correlation', async () => {
  const response = await request(app).get('/health/live').set('X-Request-Id', 'test-request');
  expect(response.status).toBe(200);
  expect(response.headers['x-request-id']).toBe('test-request');
  expect(response.body.data.status).toBe('ok');
});
it('normalizes 404, malformed JSON and missing CSRF header', async () => {
  const missing = await request(app).get('/missing');
  expect(missing.status).toBe(404);
  expect(missing.body.error.code).toBe('NOT_FOUND');
  const csrf = await request(app).post('/api/v1/auth/logout');
  expect(csrf.status).toBe(403);
  const bad = await request(app)
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .set('X-Requested-With', 'fetch')
    .send('{');
  expect(bad.status).toBe(400);
  expect(bad.body.error.code).toBe('INVALID_JSON');
});
it('rejects untrusted origins and anonymous access', async () => {
  expect(
    (await request(app).get('/health/live').set('Origin', 'https://untrusted.example')).status,
  ).toBe(403);
  expect((await request(app).get('/api/v1/patients/me')).status).toBe(401);
});
it('exposes OpenAPI routes', async () => {
  const response = await request(app).get('/api/v1/docs/openapi.json');
  expect(response.status).toBe(200);
  expect(response.body.paths['/appointments/{id}/cancel']).toBeDefined();
});
