import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/async-handler.js';
import { unauthorized } from '../errors/app-error.js';
import { identityRepository } from '../modules/auth/auth.repository.js';
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token: unknown =
    req.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? req.cookies?.access_token;
  if (typeof token !== 'string') throw unauthorized();
  let identity: { id: string; version: number } | undefined;
  for (const secret of [env.JWT_SECRET, env.JWT_SECRET_PREVIOUS].filter(Boolean)) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ['HS256'],
        issuer: 'medimatrix',
        audience: 'medimatrix-api',
      });
      if (payload.sub && typeof payload.ver === 'number')
        identity = { id: payload.sub, version: payload.ver };
      break;
    } catch {
      /* Try the previous signing key during rotation. */
    }
  }
  if (!identity) throw unauthorized();
  const user = await identityRepository.byId(identity.id);
  if (!user || user.deletedAt || user.sessionVersion !== identity.version) throw unauthorized();
  req.user = { id: user.id, role: user.role };
  next();
});
