import type { Response } from 'express';
export function ok(res: Response, data: unknown, meta?: unknown, status = 200) {
  return res.status(status).json({ success: true, data, message: 'OK', ...(meta ? { meta } : {}) });
}
