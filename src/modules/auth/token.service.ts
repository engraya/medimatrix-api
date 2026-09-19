import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import type { User } from '@prisma/client';
import type { Response, CookieOptions } from 'express';
import { env } from '../../config/env.js';
import { durationMs, hashToken, opaqueToken } from '../../utils/crypto.js';
import type { Transaction } from '../../lib/prisma.js';

export async function session(tx: Transaction, user: User, familyId: string = randomUUID()) {
  const refreshToken = opaqueToken();
  const refresh = await tx.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + durationMs(env.REFRESH_TOKEN_TTL)),
    },
  });
  const accessToken = await new SignJWT({ ver: user.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('medimatrix')
    .setAudience('medimatrix-api')
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(new TextEncoder().encode(env.JWT_SECRET));
  return { accessToken, refreshToken, refreshId: refresh.id };
}
const options = (path: string): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});
// Refresh uses the auth path so logout can revoke the same browser session.
export function setCookies(res: Response, tokens: Awaited<ReturnType<typeof session>>) {
  res.cookie('access_token', tokens.accessToken, {
    ...options('/api/v1'),
    maxAge: durationMs(env.ACCESS_TOKEN_TTL),
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...options('/api/v1/auth'),
    maxAge: durationMs(env.REFRESH_TOKEN_TTL),
  });
}
export function clearCookies(res: Response) {
  res.clearCookie('access_token', options('/api/v1'));
  res.clearCookie('refresh_token', options('/api/v1/auth'));
}
