// backend/src/lib/preorderMatcher.ts
import { prisma } from '../prisma'
import { deliverCards } from './notify'

interface ProductMeta {
  bank?: string
  network?: string
  level?: string
  type?: string
  bin?: string
  cp?: string
  age?: string
}

function parseProductMeta(description: string): ProductMeta {
  try { return JSON.parse(description) } catch { return {} }
}

function ageInRange(ageStr: string | undefined, range: string): boolean {
  if (!ageStr) return false
  const age = parseInt(ageStr)
  if (isNaN(age)) return false
  if (range === '61+') return age >= 61
  const [min, max] = range.split('-').map(Number)
  return age >= min && age <= max
}

function matches(meta: ProductMeta, preorder: {
  bank: string | null; network: string | null; level: string | null;
  cardType: string | null; bin: string | null; department: string | null; ageRange: string | null
}): boolean {
  if (preorder.bank && meta.bank?.toLowerCase() !== preorder.bank.toLowerCase()) return false
  if (preorder.network && meta.network !== preorder.network) return false
  if (preorder.level && meta.level !== preorder.level) return false
  if (preorder.cardType && meta.type !== preorder.cardType) return false
  if (preorder.bin && !meta.bin?.startsWith(preorder.bin)) return false
  if (preorder.department && !meta.cp?.startsWith(preorder.department)) return false
  if (preorder.ageRange && !ageInRange(meta.age, preorder.ageRange)) return false
  return true
}

export async function matchAndDeliver(productId: number): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } })
  if (!product) return

  const meta = parseProductMeta(product.description)

  // Précommandes APPROVED avec places restantes, triées FIFO
  const preorders = await prisma.preOrder.findMany({
    where: { status: 'APPROVED' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const preorder of preorders) {
    if (preorder.fulfilled >= preorder.quantity) continue
    if (!matches(meta, preorder)) continue

    // Prendre une carte non vendue
    const card = await prisma.cardInventory.findFirst({
      where: { productId, sold: false },
      orderBy: { id: 'asc' },
    })
    if (!card) break // plus de stock

    // Marquer vendue + incrémenter fulfilled
    await prisma.$transaction([
      prisma.cardInventory.update({ where: { id: card.id }, data: { sold: true } }),
      prisma.preOrder.update({
        where: { id: preorder.id },
        data: {
          fulfilled: { increment: 1 },
          ...(preorder.fulfilled + 1 >= preorder.quantity ? { status: 'FULFILLED' } : {}),
        },
      }),
    ])

    // Sync stock
    const remaining = await prisma.cardInventory.count({ where: { productId, sold: false } })
    await prisma.product.update({ where: { id: productId }, data: { stock: remaining } })

    // Livrer via Telegram
    if (preorder.user.telegramId) {
      await deliverCards(preorder.user.telegramId, preorder.id, [
        { productName: product.name, data: card.fullData },
      ])
    }
  }
}
