import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { userFactory } from '../factories/index.js';
import { startPhoneVerification, verifyPhone } from '../../src/modules/auth/auth.service.js';
import { updateMe } from '../../src/modules/users/users.service.js';
import { processNotifications } from '../../src/modules/notifications/notification-worker.js';
import { smsDeliveries } from '../../src/lib/sms/fake.provider.js';
import { enqueue } from '../../src/modules/notifications/notifications.service.js';
const app = createApp();

it('protects administrator operations and prevents removal of the final administrator', async () => {
  const patient = await userFactory();
  const admin = await userFactory('ADMIN');
  await request(app).get('/api/v1/users').set('Authorization', patient.authorization).expect(403);
  await request(app)
    .patch(`/api/v1/users/${admin.user.id}/role`)
    .set('Authorization', admin.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ role: 'STAFF' })
    .expect(409);
  await request(app)
    .patch(`/api/v1/users/${patient.user.id}/role`)
    .set('Authorization', admin.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ role: 'ADMIN' })
    .expect(409);
  const invited = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', admin.authorization)
    .set('X-Requested-With', 'fetch')
    .send({
      name: 'Invited Staff',
      email: 'invited@example.com',
      phone: '+2348099999911',
      role: 'STAFF',
    })
    .expect(201);
  expect(invited.body.data).not.toHaveProperty('passwordHash');
  expect(await prisma.notification.count({ where: { type: 'STAFF_INVITE' } })).toBe(1);
});

it('requires verified phone control for appointment SMS and invalidates old challenges on phone change', async () => {
  const identity = await userFactory();
  await prisma.$transaction((tx) =>
    enqueue(tx, {
      userId: identity.user.id,
      type: 'APPOINTMENT_SCHEDULED',
      title: 'Appointment',
      body: 'Confirmation',
      key: 'unverified',
      channels: ['SMS'],
    }),
  );
  await processNotifications();
  expect(smsDeliveries).toHaveLength(0);
  expect(await prisma.notification.count({ where: { status: 'SKIPPED' } })).toBe(1);
  await startPhoneVerification(identity.user.id);
  await processNotifications();
  const oldCode = smsDeliveries.at(-1)?.body.match(/\b\d{6}\b/)?.[0];
  expect(oldCode).toBeDefined();
  await updateMe(identity.user.id, { phone: '+2348099999922' });
  await expect(verifyPhone(identity.user.id, oldCode!)).rejects.toMatchObject({ status: 410 });
  await startPhoneVerification(identity.user.id);
  await processNotifications();
  const code = smsDeliveries.at(-1)?.body.match(/\b\d{6}\b/)?.[0];
  await verifyPhone(identity.user.id, code!);
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { id: identity.user.id } })).phoneVerifiedAt,
  ).not.toBeNull();
});
