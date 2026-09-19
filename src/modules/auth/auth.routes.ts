import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { authLimit } from '../../middleware/rate-limit.js';
import * as schema from './auth.schema.js';
import * as service from './auth.service.js';
import { identityRepository } from './auth.repository.js';
import { setCookies, clearCookies } from './token.service.js';
export const authRouter = Router();
authRouter.use('/auth', authLimit);
endpoint(
  authRouter,
  'post',
  '/auth/login',
  { tag: 'auth', summary: 'Staff login', public: true, body: schema.loginSchema },
  async ({ body, res }) => {
    const result = await service.login(body);
    setCookies(res, result.tokens);
    return { user: result.user };
  },
);
endpoint(
  authRouter,
  'post',
  '/auth/refresh',
  { tag: 'auth', summary: 'Rotate refresh token', public: true },
  async ({ req, res }) => {
    const result = await service.refresh(req.cookies?.refresh_token);
    setCookies(res, result.tokens);
    return { user: result.user };
  },
);
endpoint(
  authRouter,
  'post',
  '/auth/logout',
  { tag: 'auth', summary: 'Revoke refresh session', public: true },
  async ({ req, res }) => {
    await service.logout(req.cookies?.refresh_token);
    clearCookies(res);
    return null;
  },
);
endpoint(
  authRouter,
  'get',
  '/auth/me',
  { tag: 'auth', summary: 'Current identity' },
  async ({ actor }) => {
    const user = await identityRepository.profile(actor.id);
    return { user, patientId: user.patient?.id ?? null };
  },
);
endpoint(
  authRouter,
  'post',
  '/auth/patient/start',
  {
    tag: 'auth',
    summary: 'Start patient email OTP authentication',
    public: true,
    body: schema.startSchema,
  },
  async ({ body }) => service.startPatient(body),
);
endpoint(
  authRouter,
  'post',
  '/auth/patient/verify',
  { tag: 'auth', summary: 'Verify patient code', public: true, body: schema.verifySchema },
  async ({ body, res }) => {
    const result = await service.verifyOtp(body);
    setCookies(res, result.tokens);
    return { user: result.user };
  },
);
endpoint(
  authRouter,
  'post',
  '/auth/forgot-password',
  { tag: 'auth', summary: 'Request password reset', public: true, body: schema.forgotSchema },
  async ({ body }) => service.forgotPassword(body.email),
);
endpoint(
  authRouter,
  'post',
  '/auth/reset-password',
  {
    tag: 'auth',
    summary: 'Reset password or accept invitation',
    public: true,
    body: schema.resetSchema,
  },
  async ({ body }) => service.consumeAccountToken(body.token, 'PASSWORD_RESET', body.password),
);
endpoint(
  authRouter,
  'post',
  '/auth/verify-email',
  { tag: 'auth', summary: 'Verify email', public: true, body: schema.tokenSchema },
  async ({ body }) => service.consumeAccountToken(body.token, 'EMAIL_VERIFY'),
);
endpoint(
  authRouter,
  'post',
  '/auth/phone/start',
  { tag: 'auth', summary: 'Send a code to verify my phone for appointment SMS' },
  async ({ actor }) => service.startPhoneVerification(actor.id),
);
endpoint(
  authRouter,
  'post',
  '/auth/phone/verify',
  { tag: 'auth', summary: 'Verify my phone', body: schema.phoneVerifySchema },
  async ({ actor, body }) => service.verifyPhone(actor.id, body.code),
);
