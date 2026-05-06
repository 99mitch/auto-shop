import { Router } from 'express'
import { InputFile } from 'grammy'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { bot } from '../bot'
import { notify } from '../lib/notify'
import { createCryptoPayment } from '../lib/cryptoApi'
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
interface Formats { brut: boolean; specialTxt: boolean; specialXlsx: boolean }
interface Splits  { brut: SplitCfg; specialTxt: SplitCfg; specialXlsx: SplitCfg }

function categoryFilter(typeUp: ExtractionType) {
  if (typeUp === 'FICHE')    return { inFiche: true,    extractedAsFiche: false }
  if (typeUp === 'NUMLIST')  return { inNumlist: true,  extractedAsNumlist: false }
  return                            { inMaillist: true, extractedAsMaillist: false }
}

function lockData(typeUp: ExtractionType) {
  if (typeUp === 'FICHE')    return { extractedAsFiche: true }
  if (typeUp === 'NUMLIST')  return { extractedAsNumlist: true }
  return                            { extractedAsMaillist: true }
}

// POST /api/data-orders/extract
router.post('/extract', async (req: AuthRequest, res) => {
  const { fileIds, type, dobFrom, dobTo, departments, banks, gender, withNames, formats, splits, paymentMethod } = req.body as {
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
    paymentMethod?: 'BALANCE' | 'CRYPTO'
  }

  if (!Array.isArray(fileIds) || fileIds.length === 0)
    return res.status(400).json({ error: 'No files selected' })

  const typeUp = (type ?? '').toUpperCase() as ExtractionType
  if (!['FICHE', 'NUMLIST', 'MAILLIST'].includes(typeUp))
    return res.status(400).json({ error: 'Invalid type' })

  if (!formats?.brut && !formats?.specialTxt && !formats?.specialXlsx)
    return res.status(400).json({ error: 'Select at least one format' })

  try {
    const records = await prisma.dataRecord.findMany({
      where: {
        fileId: { in: fileIds },
        ...categoryFilter(typeUp),
        ...(dobFrom || dobTo ? { dateNaissance: { ...(dobFrom ? { gte: dobFrom } : {}), ...(dobTo ? { lte: dobTo } : {}) } } : {}),
        ...(departments && departments.length > 0 ? { department: { in: departments } } : {}),
        ...(banks && banks.length > 0 ? { bank: { in: banks } } : {}),
        ...(gender && gender !== 'ALL' ? { gender } : {}),
      },
    })

    if (records.length === 0)
      return res.status(400).json({ error: 'No matching records' })

    // Lock records atomically
    await prisma.dataRecord.updateMany({
      where: { id: { in: records.map((r) => r.id) } },
      data: lockData(typeUp),
    })

    const user      = await prisma.user.findUnique({ where: { id: req.userId! } })
    const username  = user?.username ?? user?.firstName ?? `user${req.userId}`
    const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const dateLabel = new Date().toISOString().slice(0, 10)
    const meta      = { type: typeUp, date: dateLabel }

    const filesToCreate: Array<{ fileType: string; filename: string; content: string; partNumber?: number }> = []

    const addFiles = (
      fileType: string,
      ext: string,
      linesPerFile: number | null,
      contentFn: (chunk: RecordData[], part?: { num: number; total: number }) => string,
    ) => {
      const chunks = splitInto(records as RecordData[], linesPerFile ?? records.length)
      const total  = chunks.length
      chunks.forEach((chunk, idx) => {
        const partNum    = total > 1 ? idx + 1 : undefined
        const partSuffix = total > 1 ? `_part${partNum}` : ''
        const slug       = fileType === 'BRUT' ? 'brut' : fileType === 'SPECIAL_TXT' ? 'acall' : 'sender'
        const filename   = `${username}_${typeUp.toLowerCase()}_${dateStr}_${slug}${partSuffix}.${ext}`
        const content    = contentFn(chunk, total > 1 ? { num: partNum!, total } : undefined)
        filesToCreate.push({ fileType, filename, content, partNumber: partNum })
      })
    }

    if (formats.brut) {
      addFiles('BRUT', 'txt', splits?.brut?.linesPerFile ?? null,
        (chunk, part) => generateBrut(chunk, typeUp, withNames ?? false, { ...meta, part }))
    }
    if (formats.specialTxt) {
      addFiles('SPECIAL_TXT', 'txt', splits?.specialTxt?.linesPerFile ?? null,
        (chunk, part) => generateSpecialTxt(chunk, { ...meta, part }))
    }
    if (formats.specialXlsx) {
      addFiles('SPECIAL_XLSX', 'xlsx', splits?.specialXlsx?.linesPerFile ?? null,
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

    if (paymentMethod === 'CRYPTO') {
      // Créer le paiement crypto — les fichiers sont déjà en DB, livraison par webhook
      try {
        const payment = await createCryptoPayment(
          records.length * 0.1, // prix fixe : 0.10€ par ligne (à ajuster)
          `Extraction ${typeUp} #${order.id}`,
          { type: 'data-order', refId: order.id, userId: req.userId! }
        )
        await prisma.dataOrder.update({
          where: { id: order.id },
          data: { status: 'PENDING_PAYMENT', cryptoPaymentId: payment.paymentId },
        })
        return res.json({ orderId: order.id, lineCount: records.length, cryptoPayment: payment })
      } catch (err) {
        console.error('[dataOrders] crypto payment error:', err)
        // Si crypto échoue, livrer quand même (fallback)
      }
    }

    // Paiement BALANCE ou fallback : notifier immédiatement
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
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.send(Buffer.from(file.content, 'base64'))
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
