import { Router, Request, Response } from 'express'
import { validateInitData } from '../lib/telegram'
import { signJwt } from '../lib/jwt'
import { prisma } from '../prisma'
import { getAdminIds } from '../middleware/admin'

const router = Router()

router.post('/init', async (req: Request, res: Response) => {
  const initData = req.headers['x-telegram-init-data'] as string

  if (!initData) {
    res.status(400).json({ error: 'Missing X-Telegram-Init-Data header' })
    return
  }

  try {
    const tgUser = validateInitData(initData, process.env.BOT_TOKEN!)

    const user = await prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: {
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        photoUrl: tgUser.photo_url ?? null,
      },
      create: {
        telegramId: String(tgUser.id),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        photoUrl: tgUser.photo_url ?? null,
      },
    })

    const token = signJwt({ userId: user.id, telegramId: user.telegramId })
    const isAdmin = getAdminIds().includes(user.telegramId)

    res.json({ token, user, isAdmin })
  } catch (err) {
    res.status(401).json({ error: 'Invalid initData' })
  }
})

export default router
