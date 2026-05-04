import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { InputFile } from 'grammy'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { bot } from '../bot'
import { generateRawFile, generateSpecialFile } from '../lib/generateFiles'
import { notify } from '../lib/notify'

const router = Router()
router.use(authMiddleware)

// POST /api/data-orders/extract
router.post('/extract', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { fileIds, type, dobFrom, dobTo, departments, banks, gender, withNames } = req.body as {
    fileIds: number[]
    type: string
    dobFrom?: string
    dobTo?: string
    departments?: string[]
    banks?: string[]
    gender?: string
    withNames?: boolean
  }

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'No files selected' })
  }

  const typeUp = (type ?? '').toUpperCase() as 'FICHE' | 'NUMLIST' | 'MAILLIST'
  if (!['FICHE', 'NUMLIST', 'MAILLIST'].includes(typeUp)) {
    return res.status(400).json({ error: 'Invalid type' })
  }

  const inField = typeUp === 'FICHE' ? 'inFiche' : typeUp === 'NUMLIST' ? 'inNumlist' : 'inMaillist'
  const exField = typeUp === 'FICHE' ? 'extractedAsFiche' : typeUp === 'NUMLIST' ? 'extractedAsNumlist' : 'extractedAsMaillist'

  try {
    const where: Prisma.DataRecordWhereInput = {
      fileId: { in: fileIds },
      [inField]: true,
      [exField]: false,
    }
    if (dobFrom || dobTo) {
      where.dateNaissance = {
        ...(dobFrom ? { gte: dobFrom } : {}),
        ...(dobTo   ? { lte: dobTo   } : {}),
      }
    }
    if (departments && departments.length > 0) where.department = { in: departments }
    if (banks && banks.length > 0) where.bank = { in: banks }
    if (gender && gender !== 'ALL') where.gender = gender

    const records = await prisma.dataRecord.findMany({ where })

    if (records.length === 0) {
      return res.status(400).json({ error: 'No matching records' })
    }

    // Lock records atomically
    await prisma.dataRecord.updateMany({
      where: { id: { in: records.map((r) => r.id) } },
      data: { [exField]: true },
    })

    // Get user info for filename
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const username = user?.username ?? user?.firstName ?? `user${userId}`
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    const rawContent     = generateRawFile(records, typeUp, withNames ?? false)
    const specialContent = generateSpecialFile(records)
    const rawExt         = typeUp === 'FICHE' ? 'csv' : (withNames ? 'csv' : 'txt')
    const rawFilename     = `${username}_${typeUp.toLowerCase()}_${dateStr}.${rawExt}`
    const specialFilename = `${username}_${typeUp.toLowerCase()}_${dateStr}_special.txt`

    const order = await prisma.dataOrder.create({
      data: {
        userId,
        type: typeUp,
        withNames: withNames ?? false,
        lineCount: records.length,
        files: {
          create: [
            { fileType: 'RAW',     filename: rawFilename,     content: rawContent },
            { fileType: 'SPECIAL', filename: specialFilename, content: specialContent },
          ],
        },
        records: {
          create: records.map((r) => ({ recordId: r.id })),
        },
      },
    })

    // Non-blocking Telegram notification
    if (user?.telegramId) {
      notify(user.telegramId, `✅ Extraction prête\n${records.length} lignes • ${typeUp}\nRécupère-la dans Mes Commandes`).catch(() => {})
    }

    res.json({ orderId: order.id, lineCount: records.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/data-orders — user's orders
router.get('/', async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.dataOrder.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { files: { select: { id: true, fileType: true, filename: true, createdAt: true } } },
    })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/data-orders/:id/download/:fileId — download a file
router.get('/:id/download/:fileId', async (req: AuthRequest, res) => {
  const orderId  = parseInt(req.params.id)
  const fileId   = parseInt(req.params.fileId)

  try {
    const order = await prisma.dataOrder.findFirst({
      where: { id: orderId, userId: req.userId! },
    })
    if (!order) return res.status(404).json({ error: 'Not found' })

    const file = await prisma.dataOrderFile.findFirst({
      where: { id: fileId, orderId },
    })
    if (!file) return res.status(404).json({ error: 'File not found' })

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(file.content)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/data-orders/:id/send-telegram — send files via bot
router.post('/:id/send-telegram', async (req: AuthRequest, res) => {
  const orderId = parseInt(req.params.id)

  try {
    const order = await prisma.dataOrder.findFirst({
      where: { id: orderId, userId: req.userId! },
      include: { files: true },
    })
    if (!order) return res.status(404).json({ error: 'Not found' })

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.telegramId) return res.status(400).json({ error: 'No Telegram account' })

    const chatId = user.telegramId

    for (const f of order.files) {
      const buf = Buffer.from(f.content, 'utf-8')
      await bot.api.sendDocument(chatId, new InputFile(buf, f.filename))
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
