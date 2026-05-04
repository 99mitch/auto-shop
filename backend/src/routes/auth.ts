import { Router, Request, Response } from 'express'
import { validateInitData } from '../lib/telegram'
import { signJwt } from '../lib/jwt'
import { prisma } from '../prisma'
import { getAdminIds } from '../middleware/admin'

const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

const router = Router()

router.post('/init', async (req: Request, res: Response) => {
  const initData = req.headers['x-telegram-init-data'] as string

  if (!initData) {
    res.status(400).json({ error: 'Missing X-Telegram-Init-Data header' })
    return
  }

  // Dev mode: bypass Telegram validation when DEV_MODE=true
  if (process.env.DEV_MODE === 'true' && initData === 'dev-mode') {
    const user = await prisma.user.upsert({
      where: { telegramId: '0' },
      update: { firstName: 'Dev User' },
      create: { telegramId: '0', firstName: 'Dev User', username: 'devuser' },
    })
    const token = signJwt({ userId: user.id, telegramId: user.telegramId })
    const isAdmin = getAdminIds().includes(user.telegramId)
    const isCollab = user.role === 'COLLABORATOR'
    res.json({ token, user, isAdmin, isCollab })
    return
  }

  try {
    const tgUser = validateInitData(initData, process.env.BOT_TOKEN!)
    const telegramId = String(tgUser.id)

    const adminIds = getAdminIds()
    const shouldBeAdmin = adminIds.includes(telegramId) || STATIC_ADMIN_IDS.includes(telegramId)

    const user = await prisma.user.upsert({
      where: { telegramId },
      update: {
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        photoUrl: tgUser.photo_url ?? null,
        ...(shouldBeAdmin ? { role: 'ADMIN' } : {}),
      },
      create: {
        telegramId,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        photoUrl: tgUser.photo_url ?? null,
        role: shouldBeAdmin ? 'ADMIN' : 'CUSTOMER',
      },
    })

    const token = signJwt({ userId: user.id, telegramId: user.telegramId })
    const isAdmin = user.role === 'ADMIN' || shouldBeAdmin
    const isCollab = user.role === 'COLLABORATOR' || user.role === 'ADMIN' || shouldBeAdmin

    res.json({ token, user, isAdmin, isCollab })
  } catch (err) {
    res.status(401).json({ error: 'Invalid initData' })
  }
})

export default router
