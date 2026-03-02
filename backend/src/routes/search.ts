import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q || q.length < 2) {
    return res.json({ leads: [], accounts: [], contacts: [], opportunities: [] })
  }

  const [leads, accounts, contacts, opportunities] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true },
    }),
    prisma.account.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 5,
      select: { id: true, name: true, industry: true },
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.opportunity.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 5,
      select: { id: true, name: true, stage: true, amount: true, account: { select: { name: true } } },
    }),
  ])

  res.json({ leads, accounts, contacts, opportunities })
})

export default router
