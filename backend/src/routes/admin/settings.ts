import { Router } from 'express'
import { prisma } from '../../prisma'
import { UpdateSettingsSchema } from 'floramini-types'

const router = Router()

async function getSettings() {
  const rows = await prisma.setting.findMany()
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]))
}

router.get('/', async (_req, res) => {
  res.json(await getSettings())
})

router.put('/', async (req, res) => {
  const parsed = UpdateSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { deliveryFee, timeSlots } = parsed.data

  if (deliveryFee !== undefined) {
    await prisma.setting.upsert({
      where: { key: 'deliveryFee' },
      update: { value: String(deliveryFee) },
      create: { key: 'deliveryFee', value: String(deliveryFee) },
    })
  }

  if (timeSlots !== undefined) {
    await prisma.setting.upsert({
      where: { key: 'timeSlots' },
      update: { value: JSON.stringify(timeSlots) },
      create: { key: 'timeSlots', value: JSON.stringify(timeSlots) },
    })
  }

  res.json(await getSettings())
})

export default router
