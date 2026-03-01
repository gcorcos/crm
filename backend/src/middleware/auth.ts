import { Request, Response, NextFunction } from 'express'
import { verifyAccess, JwtPayload } from '../lib/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  const token = header.slice(7)
  try {
    req.user = verifyAccess(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission insuffisante' })
    }
    next()
  }
}
