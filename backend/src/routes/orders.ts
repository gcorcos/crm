import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.order.count({ where: { number: { startsWith: `CMD-${year}-` } } })
  return `CMD-${year}-${String(count + 1).padStart(4, '0')}`
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
    prisma.order.findMany({
      where: where as any,
      include: {
        account: { select: { id: true, name: true } },
        contract: { select: { id: true, number: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.order.count({ where: where as any }),
  ])
  return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      account: true,
      contract: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!order) return res.status(404).json({ error: 'Commande non trouvée' })
  return res.json(order)
})

router.post('/', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { totalAmount, status, orderDate, notes, accountId, contractId } = req.body
  if (!totalAmount || !accountId) return res.status(400).json({ error: 'Montant et compte requis' })
  const number = await generateOrderNumber()
  const order = await prisma.order.create({
    data: {
      number, totalAmount,
      status: status ?? 'PENDING',
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      notes, accountId, contractId,
      ownerId: req.user!.userId,
    },
  })
  return res.status(201).json(order)
})

router.patch('/:id', requireRole('ADMIN', 'MANAGER', 'SALES'), async (req: AuthRequest, res: Response) => {
  const { totalAmount, status, orderDate, notes, ownerId } = req.body
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { totalAmount, status, orderDate: orderDate ? new Date(orderDate) : undefined, notes, ownerId },
  })
  return res.json(order)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  await prisma.order.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

export default router
