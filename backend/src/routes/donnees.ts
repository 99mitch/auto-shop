import { Router } from 'express'
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

  try {
    const files = await prisma.dataFile.findMany({
      where: type === 'FICHE'
        ? { ficheCount: { gt: 0 } }
        : type === 'NUMLIST'
        ? { numlistCount: { gt: 0 } }
        : { maillistCount: { gt: 0 } },
      orderBy: { uploadedAt: 'desc' },
    })

    const withAvailable = await Promise.all(
      files.map(async (f) => {
        const available = await prisma.dataRecord.count({
          where: type === 'FICHE'
            ? { fileId: f.id, inFiche: true,    extractedAsFiche: false }
            : type === 'NUMLIST'
            ? { fileId: f.id, inNumlist: true,  extractedAsNumlist: false }
            : { fileId: f.id, inMaillist: true, extractedAsMaillist: false },
        })
        return {
          id: f.id,
          name: f.name,
          uploadedAt: f.uploadedAt,
          total: type === 'FICHE' ? f.ficheCount : type === 'NUMLIST' ? f.numlistCount : f.maillistCount,
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

  try {
    const categoryFilter = typeUp === 'FICHE'
      ? { inFiche: true,    extractedAsFiche: false }
      : typeUp === 'NUMLIST'
      ? { inNumlist: true,  extractedAsNumlist: false }
      : { inMaillist: true, extractedAsMaillist: false }

    const count = await prisma.dataRecord.count({
      where: {
        fileId: { in: fileIds },
        ...categoryFilter,
        ...(dobFrom || dobTo ? { dateNaissance: { ...(dobFrom ? { gte: dobFrom } : {}), ...(dobTo ? { lte: dobTo } : {}) } } : {}),
        ...(departments && departments.length > 0 ? { department: { in: departments } } : {}),
        ...(banks && banks.length > 0 ? { bank: { in: banks } } : {}),
        ...(gender && gender !== 'ALL' ? { gender } : {}),
      },
    })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
