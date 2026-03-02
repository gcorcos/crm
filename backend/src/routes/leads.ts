import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const router = Router()
router.use(authenticate)

// GET /api/leads
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, search, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { company: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.lead.count({ where }),
  ])

  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

// GET /api/leads/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!lead) return res.status(404).json({ error: 'Lead non trouvé' })
  return res.json(lead)
})

// POST /api/leads
router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, phone, company, source, notes } = req.body
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Prénom, nom et email requis' })
  }
  const existing = await prisma.lead.findFirst({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Un lead avec cet email existe déjà', existingId: existing.id })
  }
  const lead = await prisma.lead.create({
    data: {
      firstName, lastName, email, phone, company,
      source: source ?? 'OTHER',
      notes,
      ownerId: req.user!.userId,
    },
  })
  logAudit({ entity: 'Lead', entityId: lead.id, action: 'CREATE', after: lead, userId: req.user!.userId })
  return res.status(201).json(lead)
})

// PATCH /api/leads/:id
router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, phone, company, source, status, score, notes, ownerId } = req.body
  const before = await prisma.lead.findUnique({ where: { id: req.params.id } })
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { firstName, lastName, email, phone, company, source, status, score, notes, ownerId },
  })
  logAudit({ entity: 'Lead', entityId: lead.id, action: 'UPDATE', before, after: lead, userId: req.user!.userId })
  return res.json(lead)
})

// POST /api/leads/:id/convert
router.post('/:id/convert', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } })
  if (!lead) return res.status(404).json({ error: 'Lead non trouvé' })
  if (lead.status === 'CONVERTED') return res.status(400).json({ error: 'Lead déjà converti' })

  const { opportunityName, amount, closeDate } = req.body

  const result = await prisma.$transaction(async (tx) => {
    const accountName = lead.company ?? `${lead.firstName} ${lead.lastName}`
    const account = await tx.account.upsert({
      where: { name: accountName },
      update: {},
      create: { name: accountName, ownerId: lead.ownerId },
    })
    const contact = await tx.contact.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone ?? undefined,
        accountId: account.id,
        ownerId: lead.ownerId,
      },
    })
    const opportunity = await tx.opportunity.create({
      data: {
        name: opportunityName ?? `${accountName} — Opportunité`,
        amount: amount ?? 0,
        closeDate: closeDate ? new Date(closeDate) : new Date(Date.now() + 30 * 86400000),
        accountId: account.id,
        contactId: contact.id,
        ownerId: lead.ownerId,
      },
    })
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'CONVERTED', convertedAt: new Date() },
    })
    return { account, contact, opportunity }
  })

  return res.status(201).json(result)
})

// DELETE /api/leads/:id
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const before = await prisma.lead.findUnique({ where: { id: req.params.id } })
  await prisma.lead.delete({ where: { id: req.params.id } })
  logAudit({ entity: 'Lead', entityId: req.params.id, action: 'DELETE', before, userId: req.user!.userId })
  return res.status(204).send()
})

export default router
