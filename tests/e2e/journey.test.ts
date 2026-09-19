import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { processNotifications } from '../../src/modules/notifications/notification-worker.js';
import { emailDeliveries } from '../../src/modules/emails/providers/console.provider.js';
import { smsDeliveries } from '../../src/lib/sms/fake.provider.js';
import { doctorFactory, userFactory, registration } from '../factories/index.js';
const app = createApp();
it('patient OTP → registration → booking → staff schedule → patient inbox', async () => {
  const doctor = await doctorFactory();
  const staff = await userFactory('STAFF');
  const patient = request.agent(app);
  const start = await patient
    .post('/api/v1/auth/patient/start')
    .set('X-Requested-With', 'fetch')
    .send({ name: 'Patient Example', email: 'patient@example.com', phone: '+2348098765432' })
    .expect(200);
  await processNotifications();
  const code = emailDeliveries
    .find((m) => m.to === 'patient@example.com')
    ?.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toBeDefined();
  await patient
    .post('/api/v1/auth/patient/verify')
    .set('X-Requested-With', 'fetch')
    .send({ userId: start.body.data.userId, code })
    .expect(200);
  await patient.post('/api/v1/auth/phone/start').set('X-Requested-With', 'fetch').expect(200);
  await processNotifications();
  const phoneCode = smsDeliveries.at(-1)?.body.match(/\b\d{6}\b/)?.[0];
  expect(phoneCode).toBeDefined();
  await patient
    .post('/api/v1/auth/phone/verify')
    .set('X-Requested-With', 'fetch')
    .send({ code: phoneCode })
    .expect(200);
  await patient
    .post('/api/v1/patients')
    .set('X-Requested-With', 'fetch')
    .send(registration)
    .expect(201);
  await patient
    .post('/api/v1/patients')
    .set('X-Requested-With', 'fetch')
    .send(registration)
    .expect(409);
  const created = await patient
    .post('/api/v1/appointments')
    .set('X-Requested-With', 'fetch')
    .send({ doctorId: doctor.id, schedule: '2099-01-01T10:00:00Z', reason: 'Annual checkup' })
    .expect(201);
  expect(created.body.data.status).toBe('PENDING');
  const id = created.body.data.id as string;
  await request(app)
    .patch(`/api/v1/appointments/${id}/schedule`)
    .set('Authorization', staff.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ doctorId: doctor.id, schedule: '2099-01-02T10:00:00Z' })
    .expect(200);
  await patient
    .patch(`/api/v1/appointments/${id}/cancel`)
    .set('X-Requested-With', 'fetch')
    .send({ cancellationReason: 'Changed plans' })
    .expect(403);
  await processNotifications();
  expect(smsDeliveries.some((m) => m.body.includes('Your appointment is confirmed'))).toBe(true);
  const inbox = await patient.get('/api/v1/notifications').expect(200);
  expect(inbox.body.data.some((n: { type: string }) => n.type === 'APPOINTMENT_SCHEDULED')).toBe(
    true,
  );
  await request(app)
    .patch(`/api/v1/appointments/${id}/cancel`)
    .set('Authorization', staff.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ cancellationReason: 'Doctor unavailable' })
    .expect(200);
  await request(app)
    .patch(`/api/v1/appointments/${id}/schedule`)
    .set('Authorization', staff.authorization)
    .set('X-Requested-With', 'fetch')
    .send({ doctorId: doctor.id, schedule: '2099-01-02T10:00:00Z' })
    .expect(409);
  expect(await prisma.auditLog.count({ where: { entityId: id } })).toBeGreaterThanOrEqual(3);
});
