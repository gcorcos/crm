import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, industry, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (industry) where.industry = industry
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { city: { contains: search as string, mode: 'insensitive' } },
    ]
  }
  const [data, total] = await Promise.all([
    prisma.account.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { contacts: true, opportunities: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.account.count({ where }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const account = await prisma.account.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      contacts: true,
      opportunities: { orderBy: { createdAt: 'desc' } },
      contracts: { orderBy: { createdAt: 'desc' } },
      orders: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!account) return res.status(404).json({ error: 'Compte non trouvé' })
  return res.json(account)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { name, industry, size, website, address, city, country, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  const existing = await prisma.account.findUnique({ where: { name } })
  if (existing) return res.status(409).json({ error: 'Compte avec ce nom déjà existant' })
  const account = await prisma.account.create({
    data: { name, industry, size, website, address, city, country, notes, ownerId: req.user!.userId },
  })
  logAudit({ entity: 'Account', entityId: account.id, action: 'CREATE', after: account, userId: req.user!.userId })
  return res.status(201).json(account)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { name, industry, size, website, address, city, country, notes, ownerId } = req.body
  const before = await prisma.account.findUnique({ where: { id: req.params.id } })
  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: { name, industry, size, website, address, city, country, notes, ownerId },
  })
  logAudit({ entity: 'Account', entityId: account.id, action: 'UPDATE', before, after: account, userId: req.user!.userId })
  return res.json(account)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const [contacts, opportunities] = await Promise.all([
    prisma.contact.count({ where: { accountId: req.params.id } }),
    prisma.opportunity.count({ where: { accountId: req.params.id, stage: { notIn: ['WON', 'LOST'] } } }),
  ])
  if (contacts > 0 || opportunities > 0) {
    return res.status(400).json({ error: 'Impossible : contacts ou opportunités actives rattachées' })
  }
  const before = await prisma.account.findUnique({ where: { id: req.params.id } })
  await prisma.account.delete({ where: { id: req.params.id } })
  logAudit({ entity: 'Account', entityId: req.params.id, action: 'DELETE', before, userId: req.user!.userId })
  return res.status(204).send()
})

export default router
