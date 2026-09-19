import type { UserRole } from '@prisma/client';
declare global {
  // Express uses ambient namespaces for request augmentation.
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}
export {};
