import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../../prisma'
import { signWebJwt } from '../../lib/jwt'

const router = Router()
const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

function verifyTelegramWidget(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')
  return hmac === hash
}

router.post('/telegram', async (req: Request, res: Response) => {
  const data = req.body as Record<string, string>

  if (!data.hash || !data.id || !data.auth_date) {
    res.status(400).json({ error: 'Missing Telegram auth data' })
    return
  }

  // Reject stale auth (older than 24h)
  if (Date.now() / 1000 - parseInt(data.auth_date) > 86400) {
    res.status(401).json({ error: 'Auth data expired' })
    return
  }

  if (!verifyTelegramWidget(data, process.env.BOT_TOKEN!)) {
    res.status(401).json({ error: 'Invalid Telegram signature' })
    return
  }

  const telegramId = String(data.id)
  const isSuperAdmin = STATIC_ADMIN_IDS.includes(telegramId)

  // For super admins, upsert so they don't need to open the mini-app first
  let user = isSuperAdmin
    ? await prisma.user.upsert({
        where: { telegramId },
        update: { role: 'ADMIN', firstName: data.first_name ?? 'Admin', username: data.username ?? null },
        create: {
          telegramId,
          firstName: data.first_name ?? 'Admin',
          lastName: data.last_name ?? null,
          username: data.username ?? null,
          role: 'ADMIN',
        },
      })
    : await prisma.user.findUnique({ where: { telegramId }, select: { id: true, role: true, firstName: true, username: true } })

  if (!user) {
    res.status(403).json({ error: "Compte introuvable — ouvre d'abord la mini app" })
    return
  }

  if (user.role !== 'ADMIN' && !isSuperAdmin) {
    res.status(403).json({ error: 'Accès réservé aux administrateurs' })
    return
  }

  const token = signWebJwt({ userId: user.id, telegramId, isSuperAdmin })
  res.json({ token, user: { ...user, telegramId, isSuperAdmin } })
})

export default router
