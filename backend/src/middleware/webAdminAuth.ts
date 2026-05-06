import { Request, Response, NextFunction } from 'express'
import { verifyWebJwt } from '../lib/jwt'
import { prisma } from '../prisma'

export interface WebAdminRequest extends Request {
  userId?: number
  telegramId?: string
  isSuperAdmin?: boolean
}

export async function webAdminAuth(req: WebAdminRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = verifyWebJwt(auth.slice(7))
    req.userId = payload.userId
    req.telegramId = payload.telegramId
    req.isSuperAdmin = payload.isSuperAdmin

    // Verify the user still has ADMIN role in DB
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true } })
    const STATIC_ADMIN_IDS = ['1396143328', '8222875527']
    if (!user || (user.role !== 'ADMIN' && !STATIC_ADMIN_IDS.includes(payload.telegramId))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
