import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()
const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

router.get('/', async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json(
    admins.map((a) => ({
      ...a,
      isSuperAdmin: STATIC_ADMIN_IDS.includes(a.telegramId),
    }))
  )
})

// Promote a user to ADMIN by telegramId
router.post('/', async (req, res) => {
  const { telegramId } = req.body as { telegramId: string }
  if (!telegramId?.trim()) {
    res.status(400).json({ error: 'telegramId required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { telegramId: telegramId.trim() } })
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable — il doit d'abord ouvrir la mini app" })
    return
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' }, select: { id: true, telegramId: true, firstName: true, role: true } })
  res.json(updated)
})

// Demote an admin back to CUSTOMER (cannot demote super admins)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const user = await prisma.user.findUnique({ where: { id }, select: { telegramId: true } })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (STATIC_ADMIN_IDS.includes(user.telegramId)) {
    res.status(403).json({ error: 'Cannot demote a super admin' })
    return
  }

  await prisma.user.update({ where: { id }, data: { role: 'CUSTOMER' } })
  res.json({ ok: true })
})

export default router
