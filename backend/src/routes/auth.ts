import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }
    const payload = { userId: user.id, email: user.email, role: user.role }
    return res.json({
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('[login error]', err)
    return res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis' })
  try {
    const payload = verifyRefresh(refreshToken)
    return res.json({ accessToken: signAccess(payload) })
  } catch {
    return res.status(401).json({ error: 'Refresh token invalide' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
  return res.json(user)
})

export default router
