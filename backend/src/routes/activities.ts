import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, type, relatedType, relatedId, overdue, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (status) where.status = status
  if (type) where.type = type
  if (relatedType) where.relatedType = relatedType
  if (relatedId) where.relatedId = relatedId
  if (overdue === 'true') {
    where.dueDate = { lt: new Date() }
    where.status = { notIn: ['DONE', 'CANCELLED'] }
  }
  const [data, total] = await Promise.all([
    prisma.activity.findMany({
      where: where as any,
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.activity.count({ where: where as any }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const activity = await prisma.activity.findUnique({
    where: { id: req.params.id },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  })
  if (!activity) return res.status(404).json({ error: 'Activité non trouvée' })
  return res.json(activity)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { type, subject, description, status, dueDate, relatedType, relatedId, leadId, opportunityId, contactId, accountId } = req.body
  if (!type || !subject || !relatedType || !relatedId) {
    return res.status(400).json({ error: 'Type, sujet et entité liée requis' })
  }
  const activity = await prisma.activity.create({
    data: {
      type, subject, description, status: status ?? 'TODO',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      relatedType, relatedId,
      leadId, opportunityId, contactId, accountId,
      ownerId: req.user!.userId,
    },
  })
  return res.status(201).json(activity)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { type, subject, description, status, dueDate, ownerId } = req.body
  const data: Record<string, unknown> = { type, subject, description, status, ownerId }
  if (dueDate) data.dueDate = new Date(dueDate)
  if (status === 'DONE') data.doneAt = new Date()
  const activity = await prisma.activity.update({ where: { id: req.params.id }, data: data as any })
  return res.json(activity)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  await prisma.activity.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

export default router
