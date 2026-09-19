import type { Request, Response, NextFunction, RequestHandler } from 'express';
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
