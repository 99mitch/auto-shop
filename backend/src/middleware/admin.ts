import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { prisma } from '../prisma'

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.telegramId || !req.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const adminIds = getAdminIds()
  if (adminIds.includes(req.telegramId)) {
    next()
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } })
  if (!user || user.role !== 'ADMIN') {
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
