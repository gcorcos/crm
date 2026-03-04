import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

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
      where: where as any,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { closeDate: 'asc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.opportunity.count({ where: where as any }),
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
  logAudit({ entity: 'Opportunity', entityId: opp.id, action: 'CREATE', after: opp, userId: req.user!.userId })
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

  const before = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
  const opp = await prisma.opportunity.update({ where: { id: req.params.id }, data: data as any })
  logAudit({ entity: 'Opportunity', entityId: opp.id, action: 'UPDATE', before, after: opp, userId: req.user!.userId })
  return res.json(opp)
})

// POST /opportunities/:id/contract — crée un contrat depuis une opp gagnée
router.post('/:id/contract', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
  if (!opp) return res.status(404).json({ error: 'Opportunité non trouvée' })
  if (opp.stage !== 'WON') return res.status(400).json({ error: "L'opportunité doit être gagnée" })

  const existing = await prisma.contract.findFirst({ where: { opportunityId: opp.id } })
  if (existing) return res.status(409).json({ error: 'Un contrat existe déjà pour cette opportunité', contract: existing })

  const year = new Date().getFullYear()
  const count = await prisma.contract.count({ where: { number: { startsWith: `CTR-${year}-` } } })
  const number = `CTR-${year}-${String(count + 1).padStart(4, '0')}`

  const { startDate, endDate, notes } = req.body
  const contract = await prisma.contract.create({
    data: {
      number,
      amount: opp.amount,
      status: 'DRAFT',
      accountId: opp.accountId,
      opportunityId: opp.id,
      ownerId: req.user!.userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notes,
    },
    include: { account: { select: { id: true, name: true } } },
  })
  return res.status(201).json(contract)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const before = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
  await prisma.opportunity.delete({ where: { id: req.params.id } })
  logAudit({ entity: 'Opportunity', entityId: req.params.id, action: 'DELETE', before, userId: req.user!.userId })
  return res.status(204).send()
})

export default router
