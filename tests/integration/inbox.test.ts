import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { enqueue } from '../../src/modules/notifications/notifications.service.js';
import { processNotifications } from '../../src/modules/notifications/notification-worker.js';
import { userFactory } from '../factories/index.js';
const app = createApp();
it('honors channel preferences and keeps inbox/read operations owner-scoped', async () => {
  const a = await userFactory();
  const b = await userFactory();
  await request(app)
    .put('/api/v1/notifications/preferences')
    .set('Authorization', a.authorization)
    .set('X-Requested-With', 'fetch')
    .send([{ type: 'APPOINTMENT_SCHEDULED', channel: 'SMS', enabled: false }])
    .expect(200);
  await prisma.$transaction((tx) =>
    enqueue(tx, {
      userId: a.user.id,
      type: 'APPOINTMENT_SCHEDULED',
      title: 'Confirmed',
      body: 'Your appointment is confirmed',
      key: 'one',
    }),
  );
  await processNotifications();
  expect(await prisma.notification.count({ where: { channel: 'SMS', status: 'SKIPPED' } })).toBe(1);
  const inbox = await request(app)
    .get('/api/v1/notifications?unread=true')
    .set('Authorization', a.authorization)
    .expect(200);
  expect(inbox.body.meta.unreadCount).toBe(1);
  expect(inbox.body.data).toHaveLength(1);
  const id = inbox.body.data[0].id as string;
  await request(app)
    .patch(`/api/v1/notifications/${id}/read`)
    .set('Authorization', b.authorization)
    .set('X-Requested-With', 'fetch')
    .expect(404);
  await request(app)
    .patch(`/api/v1/notifications/${id}/read`)
    .set('Authorization', a.authorization)
    .set('X-Requested-With', 'fetch')
    .expect(200);
  const updated = await request(app)
    .get('/api/v1/notifications?unread=true')
    .set('Authorization', a.authorization)
    .expect(200);
  expect(updated.body.meta.unreadCount).toBe(0);
});
