import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, accountId, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (accountId) where.accountId = accountId
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ]
  }
  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { lastName: 'asc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.contact.count({ where }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: {
      account: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
      opportunities: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!contact) return res.status(404).json({ error: 'Contact non trouvé' })
  return res.json(contact)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, phone, title, role, accountId } = req.body
  if (!firstName || !lastName || !email || !accountId) {
    return res.status(400).json({ error: 'Prénom, nom, email et compte requis' })
  }
  const contact = await prisma.contact.create({
    data: { firstName, lastName, email, phone, title, role, accountId, ownerId: req.user!.userId },
  })
  return res.status(201).json(contact)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, phone, title, role, accountId, ownerId } = req.body
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: { firstName, lastName, email, phone, title, role, accountId, ownerId },
  })
  return res.json(contact)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  await prisma.contact.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

export default router
