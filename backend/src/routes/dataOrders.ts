import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { InputFile } from 'grammy'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { bot } from '../bot'
import { notify } from '../lib/notify'
import {
  generateBrut,
  generateSpecialTxt,
  generateSpecialXlsx,
  splitInto,
  RecordData,
} from '../lib/generateFiles'

const router = Router()
router.use(authMiddleware)

type ExtractionType = 'FICHE' | 'NUMLIST' | 'MAILLIST'

interface SplitCfg { linesPerFile: number | null }
interface Formats {
  brut: boolean
  specialTxt: boolean
  specialXlsx: boolean
}
interface Splits {
  brut: SplitCfg
  specialTxt: SplitCfg
  specialXlsx: SplitCfg
}

function buildWhere(
  fileIds: number[],
  typeUp: ExtractionType,
  dobFrom?: string,
  dobTo?: string,
  departments?: string[],
  banks?: string[],
  gender?: string,
): Prisma.DataRecordWhereInput {
  const inField = typeUp === 'FICHE' ? 'inFiche' : typeUp === 'NUMLIST' ? 'inNumlist' : 'inMaillist'
  const exField = typeUp === 'FICHE' ? 'extractedAsFiche' : typeUp === 'NUMLIST' ? 'extractedAsNumlist' : 'extractedAsMaillist'

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
  if (banks      && banks.length > 0)        where.bank       = { in: banks }
  if (gender && gender !== 'ALL')            where.gender     = gender
  return where
}

// POST /api/data-orders/extract
router.post('/extract', async (req: AuthRequest, res) => {
  const {
    fileIds, type, dobFrom, dobTo, departments, banks, gender, withNames,
    formats, splits,
  } = req.body as {
    fileIds: number[]
    type: string
    dobFrom?: string
    dobTo?: string
    departments?: string[]
    banks?: string[]
    gender?: string
    withNames?: boolean
    formats: Formats
    splits: Splits
  }

  if (!Array.isArray(fileIds) || fileIds.length === 0)
    return res.status(400).json({ error: 'No files selected' })

  const typeUp = (type ?? '').toUpperCase() as ExtractionType
  if (!['FICHE', 'NUMLIST', 'MAILLIST'].includes(typeUp))
    return res.status(400).json({ error: 'Invalid type' })

  if (!formats.brut && !formats.specialTxt && !formats.specialXlsx)
    return res.status(400).json({ error: 'Select at least one format' })

  try {
    const where = buildWhere(fileIds, typeUp, dobFrom, dobTo, departments, banks, gender)
    const records = await prisma.dataRecord.findMany({ where })

    if (records.length === 0)
      return res.status(400).json({ error: 'No matching records' })

    // Lock records atomically
    const exField = typeUp === 'FICHE' ? 'extractedAsFiche' : typeUp === 'NUMLIST' ? 'extractedAsNumlist' : 'extractedAsMaillist'
    await prisma.dataRecord.updateMany({
      where: { id: { in: records.map((r) => r.id) } },
      data: { [exField]: true },
    })

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    const username  = user?.username ?? user?.firstName ?? `user${req.userId}`
    const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const dateLabel = new Date().toISOString().slice(0, 10)
    const meta      = { type: typeUp, date: dateLabel }

    const filesToCreate: Array<{
      fileType: string; filename: string; content: string; partNumber?: number
    }> = []

    const addFiles = (
      fileType: string,
      ext: string,
      linesPerFile: number | null,
      contentFn: (chunk: RecordData[], part?: { num: number; total: number }) => string,
    ) => {
      const parts = splitInto(records as RecordData[], linesPerFile ?? records.length)
      const total = parts.length

      parts.forEach((chunk, idx) => {
        const partNum  = total > 1 ? idx + 1 : undefined
        const partSuffix = total > 1 ? `_part${partNum}` : ''
        const base     = `${username}_${typeUp.toLowerCase()}_${dateStr}`
        const slug     = fileType === 'BRUT' ? 'brut' : fileType === 'SPECIAL_TXT' ? 'special' : 'special'
        const filename = `${base}_${slug}${partSuffix}.${ext}`
        const content  = contentFn(chunk, total > 1 ? { num: partNum!, total } : undefined)
        filesToCreate.push({ fileType, filename, content, partNumber: partNum })
      })
    }

    if (formats.brut) {
      addFiles('BRUT', 'txt', splits.brut?.linesPerFile ?? null,
        (chunk, part) => generateBrut(chunk, typeUp, withNames ?? false, { ...meta, part }))
    }
    if (formats.specialTxt) {
      addFiles('SPECIAL_TXT', 'txt', splits.specialTxt?.linesPerFile ?? null,
        (chunk, part) => generateSpecialTxt(chunk, { ...meta, part }))
    }
    if (formats.specialXlsx) {
      addFiles('SPECIAL_XLSX', 'xlsx', splits.specialXlsx?.linesPerFile ?? null,
        (chunk) => generateSpecialXlsx(chunk))
    }

    const order = await prisma.dataOrder.create({
      data: {
        userId:    req.userId!,
        type:      typeUp,
        withNames: withNames ?? false,
        lineCount: records.length,
        files:   { create: filesToCreate },
        records: { create: records.map((r) => ({ recordId: r.id })) },
      },
    })

    if (user?.telegramId) {
      notify(
        user.telegramId,
        `✅ Extraction prête — ${records.length} lignes ${typeUp}\nRécupère-la dans Mes Extractions`,
      ).catch(() => {})
    }

    res.json({ orderId: order.id, lineCount: records.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/data-orders
router.get('/', async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.dataOrder.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        files: {
          select: { id: true, fileType: true, filename: true, partNumber: true, createdAt: true },
          orderBy: [{ fileType: 'asc' }, { partNumber: 'asc' }],
        },
      },
    })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/data-orders/:id/download/:fileId
router.get('/:id/download/:fileId', async (req: AuthRequest, res) => {
  const orderId = parseInt(req.params.id)
  const fileId  = parseInt(req.params.fileId)

  try {
    const order = await prisma.dataOrder.findFirst({ where: { id: orderId, userId: req.userId! } })
    if (!order) return res.status(404).json({ error: 'Not found' })

    const file = await prisma.dataOrderFile.findFirst({ where: { id: fileId, orderId } })
    if (!file) return res.status(404).json({ error: 'File not found' })

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)

    if (file.fileType === 'SPECIAL_XLSX') {
      const buf = Buffer.from(file.content, 'base64')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.send(buf)
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.send(file.content)
    }
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/data-orders/:id/send-telegram
router.post('/:id/send-telegram', async (req: AuthRequest, res) => {
  const orderId = parseInt(req.params.id)

  try {
    const order = await prisma.dataOrder.findFirst({
      where: { id: orderId, userId: req.userId! },
      include: { files: { orderBy: [{ fileType: 'asc' }, { partNumber: 'asc' }] } },
    })
    if (!order) return res.status(404).json({ error: 'Not found' })

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.telegramId) return res.status(400).json({ error: 'No Telegram account' })

    for (const f of order.files) {
      const buf = f.fileType === 'SPECIAL_XLSX'
        ? Buffer.from(f.content, 'base64')
        : Buffer.from(f.content, 'utf-8')
      await bot.api.sendDocument(user.telegramId, new InputFile(buf, f.filename))
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
