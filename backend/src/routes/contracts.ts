import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const router = Router()
router.use(authenticate)

async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.contract.count({ where: { number: { startsWith: `CTR-${year}-` } } })
  return `CTR-${year}-${String(count + 1).padStart(4, '0')}`
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, accountId, search, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'SALES') where.ownerId = req.user!.userId
  if (status) where.status = status
  if (accountId) where.accountId = accountId
  if (search) where.number = { contains: search as string, mode: 'insensitive' }
  const [data, total] = await Promise.all([
    prisma.contract.findMany({
      where: where as any,
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.contract.count({ where: where as any }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      account: true,
      opportunity: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
      orders: true,
    },
  })
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' })
  return res.json(contract)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { amount, status, startDate, endDate, notes, accountId, opportunityId } = req.body
  if (!amount || !accountId) return res.status(400).json({ error: 'Montant et compte requis' })
  const number = await generateContractNumber()
  const contract = await prisma.contract.create({
    data: {
      number, amount,
      status: status ?? 'DRAFT',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notes, accountId, opportunityId,
      ownerId: req.user!.userId,
    },
  })
  logAudit({ entity: 'Contract', entityId: contract.id, action: 'CREATE', after: contract, userId: req.user!.userId })
  return res.status(201).json(contract)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { amount, status, startDate, endDate, signedAt, notes, ownerId } = req.body
  const data: Record<string, unknown> = { amount, status, notes, ownerId }
  if (startDate) data.startDate = new Date(startDate)
  if (endDate) data.endDate = new Date(endDate)
  if (signedAt || status === 'SIGNED') data.signedAt = signedAt ? new Date(signedAt) : new Date()
  const before = await prisma.contract.findUnique({ where: { id: req.params.id } })
  const contract = await prisma.contract.update({ where: { id: req.params.id }, data: data as any })
  logAudit({ entity: 'Contract', entityId: contract.id, action: 'UPDATE', before, after: contract, userId: req.user!.userId })
  return res.json(contract)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const before = await prisma.contract.findUnique({ where: { id: req.params.id } })
  await prisma.contract.delete({ where: { id: req.params.id } })
  logAudit({ entity: 'Contract', entityId: req.params.id, action: 'DELETE', before, userId: req.user!.userId })
  return res.status(204).send()
})

export default router
