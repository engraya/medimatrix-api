import { it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  startPatient,
  verifyOtp,
  hashPassword,
  login,
  forgotPassword,
  consumeAccountToken,
} from '../../src/modules/auth/auth.service.js';
import { processNotifications } from '../../src/modules/notifications/notification-worker.js';
import { emailDeliveries } from '../../src/modules/emails/providers/console.provider.js';
import { userFactory } from '../factories/index.js';

it('commits wrong OTP attempts, caps attempts and makes codes single-use', async () => {
  const input = { name: 'OTP Person', email: 'otp@example.com', phone: '+2348012345600' };
  const start = await startPatient(input);
  for (let i = 0; i < 5; i++)
    await expect(verifyOtp({ userId: start.userId, code: '000000' })).rejects.toMatchObject({
      code: 'OTP_INVALID',
    });
  await expect(verifyOtp({ userId: start.userId, code: '000000' })).rejects.toMatchObject({
    status: 429,
  });
  expect((await prisma.verificationToken.findFirstOrThrow()).attempts).toBe(5);
  await startPatient(input);
  await processNotifications();
  const code = emailDeliveries.at(-1)?.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toBeDefined();
  await verifyOtp({ userId: start.userId, code: code! });
  await expect(verifyOtp({ userId: start.userId, code: code! })).rejects.toMatchObject({
    status: 410,
  });
});

it('never changes an existing identity from unauthenticated patient start', async () => {
  const identity = await userFactory();
  await startPatient({ email: identity.user.email, name: 'Changed Name', phone: '+2348099999900' });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: identity.user.id } });
  expect(user.name).toBe(identity.user.name);
  expect(user.phone).toBe(identity.user.phone);
  const notice = await prisma.notification.findFirstOrThrow();
  expect(notice.body).not.toMatch(/verification code/);
});

it('expires OTP and limits sends by identity', async () => {
  const input = { name: 'Expiry Person', email: 'expiry@example.com', phone: '+2348012345601' };
  const start = await startPatient(input);
  await prisma.verificationToken.updateMany({ data: { expiresAt: new Date(0) } });
  await expect(verifyOtp({ userId: start.userId, code: '000000' })).rejects.toMatchObject({
    code: 'OTP_EXPIRED',
  });
  await startPatient(input);
  await startPatient(input);
  await expect(startPatient(input)).rejects.toMatchObject({ status: 429 });
});

it('locks staff after repeated failures and resets credentials with a single-use token', async () => {
  const identity = await userFactory('STAFF');
  await prisma.user.update({
    where: { id: identity.user.id },
    data: { passwordHash: await hashPassword('original-password-123') },
  });
  for (let i = 0; i < 10; i++)
    await expect(
      login({ email: identity.user.email, password: 'incorrect-password' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  await expect(
    login({ email: identity.user.email, password: 'original-password-123' }),
  ).rejects.toMatchObject({ status: 423 });
  expect(await forgotPassword('nobody@example.com')).toBeNull();
  await forgotPassword(identity.user.email);
  await processNotifications();
  const token = emailDeliveries.at(-1)?.text.match(/#token=([\w-]+)/)?.[1];
  expect(token).toBeDefined();
  await consumeAccountToken(token!, 'PASSWORD_RESET', 'replacement-password-123');
  await expect(
    consumeAccountToken(token!, 'PASSWORD_RESET', 'another-password-123'),
  ).rejects.toMatchObject({ status: 410 });
  expect(
    await prisma.refreshToken.count({ where: { userId: identity.user.id, revokedAt: null } }),
  ).toBe(0);
  const result = await login({ email: identity.user.email, password: 'replacement-password-123' });
  expect(result.user.id).toBe(identity.user.id);
});
