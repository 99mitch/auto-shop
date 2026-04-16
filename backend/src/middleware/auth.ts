import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../lib/jwt'

export interface AuthRequest extends Request {
  userId?: number
  telegramId?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyJwt(token)
    req.userId = payload.userId
    req.telegramId = payload.telegramId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
