import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../prisma'

const router = Router()
router.use(authMiddleware)

// GET /api/donnees/stock — total available (non-extracted) per category
router.get('/stock', async (_req, res) => {
  try {
    const [fiche, numlist, maillist] = await Promise.all([
      prisma.dataRecord.count({ where: { inFiche: true, extractedAsFiche: false } }),
      prisma.dataRecord.count({ where: { inNumlist: true, extractedAsNumlist: false } }),
      prisma.dataRecord.count({ where: { inMaillist: true, extractedAsMaillist: false } }),
    ])
    res.json({ fiche, numlist, maillist })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/donnees/files?type=FICHE|NUMLIST|MAILLIST
router.get('/files', async (req, res) => {
  const type = (req.query.type as string | undefined)?.toUpperCase()
  if (!type || !['FICHE', 'NUMLIST', 'MAILLIST'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' })
  }

  const inField   = type === 'FICHE' ? 'inFiche' : type === 'NUMLIST' ? 'inNumlist' : 'inMaillist'
  const exField   = type === 'FICHE' ? 'extractedAsFiche' : type === 'NUMLIST' ? 'extractedAsNumlist' : 'extractedAsMaillist'
  const cntField  = type === 'FICHE' ? 'ficheCount' : type === 'NUMLIST' ? 'numlistCount' : 'maillistCount'

  try {
    const files = await prisma.dataFile.findMany({
      where: { [cntField]: { gt: 0 } },
      orderBy: { uploadedAt: 'desc' },
    })

    // Compute available count per file
    const withAvailable = await Promise.all(
      files.map(async (f) => {
        const available = await prisma.dataRecord.count({
          where: { fileId: f.id, [inField]: true, [exField]: false },
        })
        return {
          id: f.id,
          name: f.name,
          uploadedAt: f.uploadedAt,
          total: (f as Record<string, unknown>)[cntField] as number,
          available,
          hasNom: f.hasNom, hasPrenom: f.hasPrenom, hasNumero: f.hasNumero,
          hasDob: f.hasDob, hasAdresse: f.hasAdresse, hasCodePostal: f.hasCodePostal,
          hasVille: f.hasVille, hasEmail: f.hasEmail, hasIban: f.hasIban, hasBic: f.hasBic,
        }
      })
    )

    res.json(withAvailable.filter((f) => f.available > 0))
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/donnees/count
router.post('/count', async (req, res) => {
  const { fileIds, type, dobFrom, dobTo, departments, banks, gender } = req.body as {
    fileIds: number[]
    type: string
    dobFrom?: string
    dobTo?: string
    departments?: string[]
    banks?: string[]
    gender?: string
  }

  if (!Array.isArray(fileIds) || fileIds.length === 0) return res.json({ count: 0 })

  const typeUp = (type ?? '').toUpperCase()
  if (!['FICHE', 'NUMLIST', 'MAILLIST'].includes(typeUp)) return res.json({ count: 0 })

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
    if (departments && departments.length > 0) {
      where.department = { in: departments }
    }
    if (banks && banks.length > 0) {
      where.bank = { in: banks }
    }
    if (gender && gender !== 'ALL') {
      where.gender = gender
    }

    const count = await prisma.dataRecord.count({ where })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
