import jwt from 'jsonwebtoken'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function signAccess(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  })
}

export function signRefresh(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  })
}

export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
}

export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload
}
