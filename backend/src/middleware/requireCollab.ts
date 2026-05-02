import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { prisma } from '../prisma'
import { getAdminIds } from './admin'

export async function requireCollab(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId || !req.telegramId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (getAdminIds().includes(req.telegramId)) {
    next()
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } })
  if (!user || user.role !== 'COLLABORATOR') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}
