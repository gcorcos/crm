import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const STAGE_PROBABILITY: Record<string, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 20,
  PROPOSAL: 40,
  NEGOTIATION: 60,
  WON: 100,
  LOST: 0,
}

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { stage, accountId, search, page = '1', limit = '50' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (stage) where.stage = stage
  if (accountId) where.accountId = accountId
  if (search) {
    where.OR = [{ name: { contains: search as string, mode: 'insensitive' } }]
  }
  const [data, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { closeDate: 'asc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.opportunity.count({ where }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const opp = await prisma.opportunity.findUnique({
    where: { id: req.params.id },
    include: {
      account: true,
      contact: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
      activities: { orderBy: { createdAt: 'desc' } },
      contracts: true,
    },
  })
  if (!opp) return res.status(404).json({ error: 'Opportunité non trouvée' })
  return res.json(opp)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { name, amount, currency, stage, probability, closeDate, accountId, contactId, notes } = req.body
  if (!name || !amount || !closeDate || !accountId) {
    return res.status(400).json({ error: 'Nom, montant, date de clôture et compte requis' })
  }
  const opp = await prisma.opportunity.create({
    data: {
      name, amount, currency: currency ?? 'EUR',
      stage: stage ?? 'PROSPECTING',
      probability: probability ?? STAGE_PROBABILITY[stage ?? 'PROSPECTING'],
      closeDate: new Date(closeDate),
      accountId, contactId,
      notes,
      ownerId: req.user!.userId,
    },
  })
  return res.status(201).json(opp)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { name, amount, currency, stage, probability, closeDate, lostReason, accountId, contactId, notes, ownerId } = req.body

  if (stage === 'LOST' && !lostReason) {
    return res.status(400).json({ error: 'Motif de perte obligatoire' })
  }

  const data: Record<string, unknown> = { name, amount, currency, stage, closeDate: closeDate ? new Date(closeDate) : undefined, lostReason, accountId, contactId, notes, ownerId }
  if (stage && probability === undefined) {
    data.probability = STAGE_PROBABILITY[stage]
  } else {
    data.probability = probability
  }

  const opp = await prisma.opportunity.update({ where: { id: req.params.id }, data })
  return res.json(opp)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  await prisma.opportunity.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

export default router
