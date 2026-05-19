import { prisma } from '../prisma'
import { deliverCards, notify, notifyOrderStatus, type CardDelivery } from './notify'
import { InputFile } from 'grammy'
import { bot } from '../bot'

export interface PayoutResultEntry {
  collabId: number
  address: string
  amount: number
  currency: string
  txHash: string
  status: 'success' | 'failed'
  error?: string
}

interface PayoutSnapshotEntry {
  collabId: number
  address: string
  currency: string
}

function readSnapshot(raw: string | null): { fundedCollabIds: Set<number>; snapshotByCollab: Map<number, PayoutSnapshotEntry> } {
  const out = { fundedCollabIds: new Set<number>(), snapshotByCollab: new Map<number, PayoutSnapshotEntry>() }
  if (!raw) return out
  try {
    const parsed = JSON.parse(raw) as { payoutSplit?: PayoutSnapshotEntry[] }
    for (const s of parsed.payoutSplit ?? []) {
      out.fundedCollabIds.add(s.collabId)
      out.snapshotByCollab.set(s.collabId, s)
    }
  } catch {}
  return out
}

export async function fulfillCCOrder(orderId: number): Promise<void> {
  // Atomic status transition — prevents double-delivery under concurrent webhook calls
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: { not: 'CONFIRMED' } },
    data: { status: 'CONFIRMED' },
  })
  if (count === 0) return

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { product: { select: { collaboratorId: true, name: true, costEur: true, description: true } } } },
    },
  })
  if (!order) return

  const { fundedCollabIds, snapshotByCollab } = readSnapshot(order.payoutSplitSnapshot)

  const earningsToCreate = order.items
    .filter((item) => item.product.collaboratorId !== null)
    .map((item) => {
      const collabId = item.product.collaboratorId!
      const gross = item.unitPrice * item.quantity
      const cost = item.product.costEur != null
        ? item.product.costEur * item.quantity
        : gross * 0.8
      const amount = parseFloat(cost.toFixed(2))
      const platformFee = parseFloat((gross - cost).toFixed(2))

      const snap = snapshotByCollab.get(collabId)
      const isFunded = fundedCollabIds.has(collabId)

      return {
        orderId: order.id,
        orderItemId: item.id,
        collaboratorId: collabId,
        amount,
        platformFee,
        status: isFunded ? 'PENDING' : 'CREDITED_OFFCHAIN',
        currency: snap?.currency ?? null,
        cryptoAmount: null,
        txHash: null,
        walletAddress: snap?.address ?? null,
        errorMessage: null,
      }
    })
  if (earningsToCreate.length > 0) {
    await prisma.collaboratorEarning.createMany({ data: earningsToCreate })
  }

  const cards: CardDelivery[] = []
  for (const item of order.items) {
    const invItems = await prisma.cardInventory.findMany({
      where: { productId: item.productId, sold: false },
      take: item.quantity,
      orderBy: { id: 'asc' },
    })
    if (invItems.length > 0) {
      await prisma.cardInventory.updateMany({
        where: { id: { in: invItems.map((i) => i.id) } },
        data: { sold: true, orderId: order.id },
      })
      const remaining = await prisma.cardInventory.count({ where: { productId: item.productId, sold: false } })
      await prisma.product.update({ where: { id: item.productId }, data: { stock: remaining } })

      let meta: Record<string, string> = {}
      try { meta = JSON.parse(item.product.description || '{}') } catch {}

      invItems.forEach((inv) => cards.push({
        productName: item.product.name,
        data: inv.fullData,
        meta: {
          bin: meta.bin,
          device: meta.device,
          ddn: meta.ddn,
          age: meta.age ? String(meta.age) : undefined,
          cp: meta.cp,
        },
      }))
    }
  }

  if (order.user.telegramId) {
    await deliverCards(order.user.telegramId, order.id, cards)
    notifyOrderStatus(order.user.telegramId, order.id, 'CONFIRMED', order.total)
  }
}

export async function applyPayoutResults(orderId: number, payoutResults: PayoutResultEntry[]): Promise<void> {
  if (!payoutResults || payoutResults.length === 0) return
  const earnings = await prisma.collaboratorEarning.findMany({ where: { orderId } })
  if (earnings.length === 0) return

  const byCollab = new Map<number, typeof earnings>()
  for (const e of earnings) {
    const arr = byCollab.get(e.collaboratorId) ?? []
    arr.push(e)
    byCollab.set(e.collaboratorId, arr)
  }

  for (const r of payoutResults) {
    const list = byCollab.get(r.collabId)
    if (!list) continue
    for (const e of list) {
      if (e.status === 'PAID_ONCHAIN') continue
      await prisma.collaboratorEarning.update({
        where: { id: e.id },
        data: {
          status: r.status === 'success' ? 'PAID_ONCHAIN' : 'PENDING',
          currency: r.currency,
          cryptoAmount: r.amount,
          txHash: r.txHash || null,
          walletAddress: r.address,
          errorMessage: r.status === 'success' ? null : (r.error ?? 'payout transfer failed'),
        },
      })
    }
  }
}

export async function fulfillDataOrder(orderId: number): Promise<void> {
  const { count } = await prisma.dataOrder.updateMany({
    where: { id: orderId, status: { not: 'READY' } },
    data: { status: 'READY' },
  })
  if (count === 0) return

  const order = await prisma.dataOrder.findUnique({
    where: { id: orderId },
    include: { user: true, files: { orderBy: [{ fileType: 'asc' }, { partNumber: 'asc' }] } },
  })
  if (!order) return

  if (!order.user.telegramId) return

  for (const f of order.files) {
    const buf =
      f.fileType === 'SPECIAL_XLSX'
        ? Buffer.from(f.content, 'base64')
        : Buffer.from(f.content, 'utf-8')
    await bot.api.sendDocument(order.user.telegramId, new InputFile(buf, f.filename))
  }

  await notify(
    order.user.telegramId,
    `✅ Extraction prête — ${order.lineCount} lignes ${order.type}\nRécupère-la dans Mes Extractions`,
  )
}
