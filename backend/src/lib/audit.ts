import { prisma } from './prisma'

export async function logAudit(params: {
  entity: string
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  before?: object | null
  after?: object | null
  userId: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        userId: params.userId,
      },
    })
  } catch (e) {
    console.error('[AuditLog] Failed to write:', e)
  }
}
