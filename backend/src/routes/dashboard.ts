import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// GET /api/dashboard/kpi
router.get('/kpi', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const role = req.user!.role
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const ownerFilter = role === 'SALES' ? { ownerId: userId } : {}

  const [
    totalPipeline,
    weightedPipeline,
    oppsByStage,
    wonThisMonth,
    wonThisYear,
    leadsTotal,
    leadsConverted,
    activitiesOverdue,
    activitiesToday,
    activitiesThisWeek,
  ] = await Promise.all([
    // Total pipeline (open opps)
    prisma.opportunity.aggregate({
      where: { ...ownerFilter, stage: { notIn: ['WON', 'LOST'] } },
      _sum: { amount: true },
    }),
    // Weighted pipeline
    prisma.opportunity.findMany({
      where: { ...ownerFilter, stage: { notIn: ['WON', 'LOST'] } },
      select: { amount: true, probability: true },
    }),
    // Opps by stage
    prisma.opportunity.groupBy({
      by: ['stage'],
      where: ownerFilter,
      _count: { id: true },
      _sum: { amount: true },
    }),
    // CA won this month
    prisma.opportunity.aggregate({
      where: { ...ownerFilter, stage: 'WON', updatedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // CA won this year
    prisma.opportunity.aggregate({
      where: { ...ownerFilter, stage: 'WON', updatedAt: { gte: startOfYear } },
      _sum: { amount: true },
    }),
    // Leads total
    prisma.lead.count({ where: ownerFilter }),
    // Leads converted
    prisma.lead.count({ where: { ...ownerFilter, status: 'CONVERTED' } }),
    // Overdue activities
    prisma.activity.count({
      where: {
        ...ownerFilter,
        dueDate: { lt: now },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
    // Activities today
    prisma.activity.count({
      where: {
        ...ownerFilter,
        dueDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
    // Activities this week
    prisma.activity.count({
      where: {
        ...ownerFilter,
        dueDate: {
          gte: new Date(now.getTime() - 7 * 86400000),
          lt: new Date(now.getTime() + 7 * 86400000),
        },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
  ])

  const weighted = weightedPipeline.reduce((sum, o) => {
    return sum + (Number(o.amount) * o.probability) / 100
  }, 0)

  return res.json({
    pipeline: {
      total: Number(totalPipeline._sum.amount ?? 0),
      weighted: Math.round(weighted),
      byStage: oppsByStage.map((s) => ({
        stage: s.stage,
        count: s._count.id,
        amount: Number(s._sum.amount ?? 0),
      })),
    },
    revenue: {
      thisMonth: Number(wonThisMonth._sum.amount ?? 0),
      thisYear: Number(wonThisYear._sum.amount ?? 0),
    },
    conversion: {
      leadsTotal,
      leadsConverted,
      rate: leadsTotal > 0 ? Math.round((leadsConverted / leadsTotal) * 100) : 0,
    },
    activities: {
      overdue: activitiesOverdue,
      today: activitiesToday,
      thisWeek: activitiesThisWeek,
    },
  })
})

// GET /api/dashboard/pipeline — kanban data
router.get('/pipeline', async (req: AuthRequest, res: Response) => {
  const ownerFilter = req.user!.role === 'SALES' ? { ownerId: req.user!.userId } : {}
  const opportunities = await prisma.opportunity.findMany({
    where: { ...ownerFilter, stage: { notIn: ['WON', 'LOST'] } },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { amount: 'desc' },
  })
  const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']
  const kanban = stages.map((stage) => ({
    stage,
    opportunities: opportunities.filter((o) => o.stage === stage),
  }))
  return res.json(kanban)
})

// GET /api/dashboard/expiring-contracts — contrats expirant dans 30j
router.get('/expiring-contracts', async (req: AuthRequest, res: Response) => {
  const ownerFilter = req.user!.role === 'SALES' ? { ownerId: req.user!.userId } : {}
  const now = new Date()
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const contracts = await prisma.contract.findMany({
    where: {
      ...ownerFilter,
      status: { in: ['ACTIVE', 'SIGNED'] },
      endDate: { gte: now, lte: in30days },
    },
    include: {
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { endDate: 'asc' },
  })
  return res.json(contracts)
})

export default router
