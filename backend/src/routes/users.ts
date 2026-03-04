import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// PATCH /api/users/me — modifier son propre profil
router.patch('/me', async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email } = req.body
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: req.user!.userId } } })
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' })
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { firstName, lastName, email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  })
  return res.json(user)
})

// PATCH /api/users/me/password — changer son mot de passe
router.patch('/me/password', async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis manquants' })
  if (newPassword.length < 8) return res.status(400).json({ error: 'Nouveau mot de passe trop court (8 car. min)' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.user!.userId }, data: { password: hashed } })
  return res.json({ message: 'Mot de passe modifié' })
})

// GET /api/users
router.get('/', async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(users)
})

// POST /api/users — admin only
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { email, password, firstName, lastName, role } = req.body
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Champs requis manquants' })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email déjà utilisé' })

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName, role: role ?? 'SALES' },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  })
  return res.status(201).json(user)
})

// PATCH /api/users/:id
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, role, isActive } = req.body
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { firstName, lastName, role, isActive },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  })
  return res.json(user)
})

// DELETE /api/users/:id — admin only
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' })
  }
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
  return res.status(204).send()
})

export default router
