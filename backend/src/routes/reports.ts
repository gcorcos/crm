import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// GET /api/reports/revenue — CA par période et commercial (US-20)
router.get('/revenue', async (req: AuthRequest, res: Response) => {
  const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()))
  const period = (req.query.period as string) ?? 'month'
  const userId = req.query.userId as string | undefined

  const ownerFilter =
    req.user!.role === 'SALES'
      ? { ownerId: req.user!.userId }
      : userId
      ? { ownerId: userId }
      : {}

  const wonOpps = await prisma.opportunity.findMany({
    where: {
      ...ownerFilter,
      stage: 'WON',
      updatedAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { updatedAt: 'asc' },
  })

  // Group by commercial × period
  const byCommercial: Record<
    string,
    { id: string; name: string; periods: Record<string, { amount: number; count: number }>; total: number }
  > = {}

  for (const opp of wonOpps) {
    const key = opp.ownerId
    const name = `${opp.owner.firstName} ${opp.owner.lastName}`
    if (!byCommercial[key]) byCommercial[key] = { id: key, name, periods: {}, total: 0 }

    const d = new Date(opp.updatedAt)
    const periodKey =
      period === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : period === 'quarter'
        ? `T${Math.ceil((d.getMonth() + 1) / 3)}`
        : String(d.getFullYear())

    if (!byCommercial[key].periods[periodKey])
      byCommercial[key].periods[periodKey] = { amount: 0, count: 0 }

    byCommercial[key].periods[periodKey].amount += Number(opp.amount)
    byCommercial[key].periods[periodKey].count += 1
    byCommercial[key].total += Number(opp.amount)
  }

  const total = wonOpps.reduce((s, o) => s + Number(o.amount), 0)
  return res.json({ year, period, commercials: Object.values(byCommercial), total })
})

// GET /api/reports — list saved reports
router.get('/', async (req: AuthRequest, res: Response) => {
  const where =
    req.user!.role === 'SALES'
      ? { OR: [{ ownerId: req.user!.userId }, { shared: true }] }
      : {}
  const reports = await prisma.report.findMany({
    where,
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return res.json(reports)
})

// POST /api/reports — save a report
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, type, filters, columns, shared } = req.body
  if (!name || !type) return res.status(400).json({ error: 'Nom et type requis' })
  const report = await prisma.report.create({
    data: {
      name,
      type,
      filters: filters ?? {},
      columns: columns ?? [],
      shared: shared ?? false,
      ownerId: req.user!.userId,
    },
  })
  return res.status(201).json(report)
})

// PATCH /api/reports/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, type, filters, columns, shared } = req.body
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { name, type, filters, columns, shared },
  })
  return res.json(report)
})

// DELETE /api/reports/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.report.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

export default router
