import { prisma } from '../prisma'

export interface PayoutDest {
  collabId: number
  address: string
  currency: 'USDT' | 'ETH' | 'SOL'
  ratio: number
  costEur: number
}

export interface BuildSplitResult {
  payoutSplit: PayoutDest[]
  unfundedCollabs: { collabId: number; costEur: number }[]
}

/**
 * Construit le payoutSplit pour une commande payée en crypto.
 * - Groupe par collab (un collab peut avoir plusieurs items dans la commande)
 * - Skip si le collab n'a pas de wallet pour la currency choisie → fallback central, earning sera CREDITED_OFFCHAIN
 * - ratio = costEur total du collab / total commande
 */
export async function buildPayoutSplit(
  orderId: number,
  currency: 'USDT' | 'ETH' | 'SOL'
): Promise<BuildSplitResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  })
  if (!order) throw new Error(`Order ${orderId} not found`)
  if (order.total <= 0) return { payoutSplit: [], unfundedCollabs: [] }

  const byCollab = new Map<number, number>()
  for (const item of order.items) {
    const collabId = item.product.collaboratorId
    const cost = item.product.costEur
    if (!collabId || cost == null) continue
    const acc = byCollab.get(collabId) ?? 0
    byCollab.set(collabId, acc + cost * item.quantity)
  }

  if (byCollab.size === 0) return { payoutSplit: [], unfundedCollabs: [] }

  const collabIds = Array.from(byCollab.keys())
  const wallets = await prisma.collabWallet.findMany({
    where: { userId: { in: collabIds }, currency },
  })
  const walletByCollab = new Map(wallets.map((w) => [w.userId, w.address]))

  const payoutSplit: PayoutDest[] = []
  const unfundedCollabs: { collabId: number; costEur: number }[] = []

  for (const [collabId, costEur] of byCollab) {
    const address = walletByCollab.get(collabId)
    if (!address) {
      unfundedCollabs.push({ collabId, costEur })
      continue
    }
    const ratio = costEur / order.total
    payoutSplit.push({ collabId, address, currency, ratio, costEur })
  }

  return { payoutSplit, unfundedCollabs }
}
