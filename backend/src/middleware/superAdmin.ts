import { Response, NextFunction } from 'express'
import { WebAdminRequest } from './webAdminAuth'

const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

export function superAdminOnly(req: WebAdminRequest, res: Response, next: NextFunction): void {
  if (!req.telegramId || !STATIC_ADMIN_IDS.includes(req.telegramId)) {
    res.status(403).json({ error: 'Super admin only' })
    return
  }
  next()
}
