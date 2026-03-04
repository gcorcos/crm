import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const ENTITIES = ['Lead', 'Account', 'Contact', 'Opportunity', 'Contract', 'Order']

router.get('/', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const { entity, userId, page = '1', limit = '50' } = req.query
  const where: Record<string, unknown> = {}
  if (entity && ENTITIES.includes(entity as string)) where.entity = entity
  if (userId) where.userId = userId

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as any,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.auditLog.count({ where: where as any }),
  ])

  return res.json({ data, total, page: Number(page), limit: Number(limit) })
})

export default router
