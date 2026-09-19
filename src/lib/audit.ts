import type { Transaction } from './prisma.js';
export function audit(
  tx: Transaction,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
) {
  return tx.auditLog.create({ data: { actorUserId, action, entityType, entityId } });
}
