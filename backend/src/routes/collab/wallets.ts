import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'

const router = Router()

const SUPPORTED_CURRENCIES = ['USDT', 'ETH', 'SOL'] as const
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

function isSupported(c: string): c is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c)
}

export function validateAddress(currency: SupportedCurrency, address: string): boolean {
  const a = address.trim()
  if (currency === 'USDT') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)
  if (currency === 'ETH') return /^0x[a-fA-F0-9]{40}$/.test(a)
  if (currency === 'SOL') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)
  return false
}

router.get('/', async (req: AuthRequest, res) => {
  const wallets = await prisma.collabWallet.findMany({
    where: { userId: req.userId! },
    orderBy: { currency: 'asc' },
  })
  res.json(wallets)
})

router.put('/:currency', async (req: AuthRequest, res) => {
  const currency = req.params.currency.toUpperCase()
  if (!isSupported(currency)) {
    res.status(400).json({ error: `Unsupported currency. Must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` })
    return
  }
  const address = String(req.body?.address ?? '').trim()
  if (!address) {
    res.status(400).json({ error: 'address required' })
    return
  }
  if (!validateAddress(currency, address)) {
    res.status(400).json({ error: `Invalid ${currency} address format` })
    return
  }

  const wallet = await prisma.collabWallet.upsert({
    where: { userId_currency: { userId: req.userId!, currency } },
    create: { userId: req.userId!, currency, address },
    update: { address },
  })
  res.json(wallet)
})

router.delete('/:currency', async (req: AuthRequest, res) => {
  const currency = req.params.currency.toUpperCase()
  if (!isSupported(currency)) {
    res.status(400).json({ error: 'Unsupported currency' })
    return
  }
  await prisma.collabWallet.deleteMany({
    where: { userId: req.userId!, currency },
  })
  res.json({ ok: true })
})

export default router
