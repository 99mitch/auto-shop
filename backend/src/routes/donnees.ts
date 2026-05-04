import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../prisma'

const router = Router()
router.use(authMiddleware)

// GET /api/donnees/files?type=FICHE|NUMLIST|MAILLIST
router.get('/files', async (req, res) => {
  const { type } = req.query
  try {
    const files = await prisma.dataFile.findMany({
      where: type ? { type: String(type).toUpperCase() } : undefined,
      orderBy: { uploadedAt: 'desc' },
    })
    res.json(files)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/donnees/count
router.post('/count', async (req, res) => {
  const { fileIds, dobFrom, dobTo, departments, banks, gender } = req.body as {
    fileIds: number[]
    dobFrom?: string
    dobTo?: string
    departments?: string[]
    banks?: string[]
    gender?: string
  }

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.json({ count: 0 })
  }

  try {
    const where: Prisma.DataRecordWhereInput = {
      fileId: { in: fileIds },
    }

    if (dobFrom || dobTo) {
      where.dob = {
        ...(dobFrom ? { gte: dobFrom } : {}),
        ...(dobTo   ? { lte: dobTo   } : {}),
      }
    }

    if (departments && departments.length > 0) {
      where.department = { in: departments }
    }

    if (banks && banks.length > 0) {
      where.bank = { in: banks.map((b) => b.toUpperCase()) }
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
