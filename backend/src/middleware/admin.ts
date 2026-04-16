import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (!req.telegramId || !adminIds.includes(req.telegramId)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}

export function getAdminIds(): string[] {
  return (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}
