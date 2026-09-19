import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { userFactory, doctorFactory, registration } from '../factories/index.js';
import { refresh } from '../../src/modules/auth/auth.service.js';
import { registerPatient } from '../../src/modules/patients/patients.service.js';
import { enqueue } from '../../src/modules/notifications/notifications.service.js';
import { processNotifications } from '../../src/modules/notifications/notification-worker.js';
import { emailDeliveries } from '../../src/modules/emails/providers/console.provider.js';
const app = createApp();
it('enforces ownership and preserves state on an unauthorized update', async () => {
  const a = await userFactory();
  const b = await userFactory();
  const doctor = await doctorFactory();
  await request(app)
    .post('/api/v1/patients')
    .set('Authorization', a.authorization)
    .set('X-Requested-With', 'fetch')
    .send(registration)
    .expect(201);
  const created = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', a.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ doctorId: doctor.id, schedule: '2099-01-01T10:00:00Z', reason: 'Checkup' })
    .expect(201);
  const id = created.body.data.id as string;
  await request(app)
    .get(`/api/v1/appointments/${id}`)
    .set('Authorization', b.authorization)
    .expect(404);
  await request(app)
    .patch(`/api/v1/appointments/${id}/cancel`)
    .set('Authorization', b.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ cancellationReason: 'Not mine' })
    .expect(404);
  expect((await prisma.appointment.findUniqueOrThrow({ where: { id } })).status).toBe('PENDING');
});
it('detects refresh reuse and invalidates the entire family', async () => {
  const identity = await userFactory('STAFF');
  const rotated = await refresh(identity.tokens.refreshToken);
  await expect(refresh(identity.tokens.refreshToken)).rejects.toMatchObject({
    code: 'REFRESH_INVALID',
  });
  await expect(refresh(rotated.tokens.refreshToken)).rejects.toMatchObject({
    code: 'REFRESH_INVALID',
  });
  await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${rotated.tokens.accessToken}`)
    .expect(401);
});
it('rolls back registration when the document belongs to another identity', async () => {
  const a = await userFactory();
  const b = await userFactory();
  const file = await prisma.file.create({
    data: {
      ownerUserId: b.user.id,
      bucket: 'local',
      storageKey: 'foreign.pdf',
      originalName: 'identity.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      checksumSha256: 'hash',
    },
  });
  await expect(
    registerPatient(
      { id: a.user.id, role: 'PATIENT' },
      {
        ...registration,
        gender: 'OTHER',
        treatmentConsent: true,
        disclosureConsent: true,
        privacyConsent: true,
        identificationDocumentId: file.id,
      },
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(await prisma.patient.count()).toBe(0);
  expect(await prisma.notification.count()).toBe(0);
});
it('does not enqueue on rollback and claims a message once across concurrent workers', async () => {
  const identity = await userFactory();
  const notification = {
    userId: identity.user.id,
    type: 'WELCOME' as const,
    title: 'Welcome',
    body: 'Hello',
    key: 'test',
    channels: ['EMAIL' as const],
  };
  await expect(
    prisma.$transaction(async (tx) => {
      await enqueue(tx, notification);
      throw new Error('rollback');
    }),
  ).rejects.toThrow('rollback');
  expect(await prisma.notification.count()).toBe(0);
  await prisma.$transaction(async (tx) => {
    await enqueue(tx, notification);
    await enqueue(tx, notification);
  });
  await Promise.all([processNotifications(), processNotifications()]);
  expect(emailDeliveries).toHaveLength(1);
  expect(await prisma.notification.count({ where: { status: 'SENT' } })).toBe(1);
});
