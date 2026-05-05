import { prisma } from '../prisma'
import { deliverCards, notify, notifyOrderStatus } from './notify'
import { InputFile } from 'grammy'
import { bot } from '../bot'

export async function fulfillCCOrder(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { product: { select: { collaboratorId: true, name: true } } } },
    },
  })
  if (!order || order.status === 'CONFIRMED') return

  await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })

  const earningsToCreate = order.items
    .filter((item) => item.product.collaboratorId !== null)
    .map((item) => {
      const gross = item.unitPrice * item.quantity
      return {
        orderId: order.id,
        orderItemId: item.id,
        collaboratorId: item.product.collaboratorId!,
        amount: parseFloat((gross * 0.8).toFixed(2)),
        platformFee: parseFloat((gross * 0.2).toFixed(2)),
      }
    })
  if (earningsToCreate.length > 0) {
    await prisma.collaboratorEarning.createMany({ data: earningsToCreate })
  }

  const deliveryCards_: Array<{ productName: string; data: string }> = []
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
      invItems.forEach((inv) => deliveryCards_.push({ productName: item.product.name, data: inv.fullData }))
    }
  }

  if (order.user.telegramId) {
    await deliverCards(order.user.telegramId, order.id, deliveryCards_)
    notifyOrderStatus(order.user.telegramId, order.id, 'CONFIRMED', order.total)
  }
}

export async function fulfillDataOrder(orderId: number): Promise<void> {
  const order = await prisma.dataOrder.findUnique({
    where: { id: orderId },
    include: { user: true, files: { orderBy: [{ fileType: 'asc' }, { partNumber: 'asc' }] } },
  })
  if (!order || order.status === 'READY') return

  await prisma.dataOrder.update({ where: { id: orderId }, data: { status: 'READY' } })

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
