import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// GET /api/organizations — liste toutes les orgs (Admin)
router.get('/', requireRole('ADMIN'), async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })
  return res.json(orgs)
})

// GET /api/organizations/me — org de l'utilisateur courant
router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { organization: true },
  })
  return res.json(user?.organization ?? null)
})

// POST /api/organizations — créer une org (Admin)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const existing = await prisma.organization.findFirst({ where: { OR: [{ name }, { slug }] } })
  if (existing) return res.status(409).json({ error: 'Organisation déjà existante' })
  const org = await prisma.organization.create({ data: { name, slug } })
  return res.status(201).json(org)
})

// PATCH /api/organizations/:id — modifier nom
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  const org = await prisma.organization.update({ where: { id: req.params.id }, data: { name } })
  return res.json(org)
})

// POST /api/organizations/:id/assign — assigner un user à cette org
router.post('/:id/assign', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })
  const user = await prisma.user.update({
    where: { id: userId },
    data: { organizationId: req.params.id },
    include: { organization: true },
  })
  return res.json(user)
})

export default router
