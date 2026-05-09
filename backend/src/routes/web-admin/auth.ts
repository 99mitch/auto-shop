import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../../prisma'
import { signWebJwt } from '../../lib/jwt'
import { validateInitData } from '../../lib/telegram'

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
  try {
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

    const botToken = process.env.BOT_TOKEN
    if (!botToken) {
      console.error('[web-admin/auth] BOT_TOKEN is not set')
      res.status(500).json({ error: 'Server misconfiguration: BOT_TOKEN missing' })
      return
    }

    if (!verifyTelegramWidget(data, botToken)) {
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
  } catch (err) {
    console.error('[web-admin/auth] Unhandled error:', err)
    res.status(500).json({ error: 'Erreur serveur inattendue' })
  }
})

// Auth via mini-app initData (auto-login when coming from the Telegram mini-app)
router.post('/miniapp', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body as { initData?: string }
    if (!initData) {
      res.status(400).json({ error: 'Missing initData' })
      return
    }

    const botToken = process.env.BOT_TOKEN
    if (!botToken) {
      res.status(500).json({ error: 'Server misconfiguration: BOT_TOKEN missing' })
      return
    }

    const tgUser = validateInitData(initData, botToken)
    const telegramId = String(tgUser.id)
    const isSuperAdmin = STATIC_ADMIN_IDS.includes(telegramId)

    let user = isSuperAdmin
      ? await prisma.user.upsert({
          where: { telegramId },
          update: { role: 'ADMIN', firstName: tgUser.first_name, username: tgUser.username ?? null },
          create: {
            telegramId,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name ?? null,
            username: tgUser.username ?? null,
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
  } catch (err) {
    console.error('[web-admin/auth/miniapp] Error:', err)
    res.status(401).json({ error: 'initData invalide ou expiré' })
  }
})

router.post('/password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body as { password?: string }
    if (!password) {
      res.status(400).json({ error: 'Mot de passe requis' })
      return
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      res.status(503).json({ error: 'Auth par mot de passe non configurée (ADMIN_PASSWORD manquant)' })
      return
    }

    const aBuf = Buffer.from(password)
    const bBuf = Buffer.from(adminPassword)
    const valid = aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf)
    if (!valid) {
      res.status(401).json({ error: 'Mot de passe incorrect' })
      return
    }

    // Trouver le premier super admin réel en base (pour que le middleware webAdminAuth l'accepte)
    let adminUser: { id: number; telegramId: string; firstName: string; username: string | null; role: string } | null = null
    for (const id of STATIC_ADMIN_IDS) {
      adminUser = await prisma.user.findUnique({
        where: { telegramId: id },
        select: { id: true, telegramId: true, role: true, firstName: true, username: true },
      })
      if (adminUser) break
    }
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, telegramId: true, role: true, firstName: true, username: true },
      })
    }
    if (!adminUser) {
      res.status(404).json({ error: "Aucun compte admin trouvé — ouvre d'abord la mini app" })
      return
    }

    const isSuperAdmin = STATIC_ADMIN_IDS.includes(adminUser.telegramId)
    const token = signWebJwt({ userId: adminUser.id, telegramId: adminUser.telegramId, isSuperAdmin })
    res.json({ token, user: { ...adminUser, isSuperAdmin } })
  } catch (err) {
    console.error('[web-admin/auth/password] Error:', err)
    res.status(500).json({ error: 'Erreur serveur inattendue' })
  }
})

export default router
