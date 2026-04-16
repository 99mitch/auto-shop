import '../setup'
import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/prisma'
import { signJwt } from '../../src/lib/jwt'

jest.mock('../../src/lib/notify', () => ({
  notifyOrderStatus: jest.fn().mockResolvedValue(undefined),
}))

let token: string
let userId: number
let productId: number
let categoryId: number

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { telegramId: '123000456', firstName: 'OrderTester' },
  })
  userId = user.id
  token = signJwt({ userId: user.id, telegramId: user.telegramId })

  await prisma.setting.upsert({
    where: { key: 'deliveryFee' },
    update: {},
    create: { key: 'deliveryFee', value: '5.00' },
  })

  const cat = await prisma.category.create({ data: { slug: 'order-test-cat', name: 'Order Test', order: 100 } })
  categoryId = cat.id

  const product = await prisma.product.create({
    data: { name: 'Test Flower', description: 'desc', price: 25, stock: 10, imageUrl: 'https://picsum.photos/99', images: '[]', categoryId },
  })
  productId = product.id
})

afterAll(async () => {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany({ where: { userId } })
  await prisma.address.deleteMany({ where: { userId } })
  await prisma.product.deleteMany({ where: { categoryId } })
  await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.user.deleteMany({ where: { id: userId } })
})

describe('POST /api/orders', () => {
  it('creates an order and decrements stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliverySlot: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId, quantity: 2 }],
        newAddress: { label: 'Home', street: '1 rue test', city: 'Paris', zip: '75001' },
      })

    expect(res.status).toBe(201)
    expect(res.body.total).toBe(55) // 25*2 + 5 delivery
    expect(res.body.status).toBe('PENDING')

    const updated = await prisma.product.findUnique({ where: { id: productId } })
    expect(updated!.stock).toBe(8)
  })

  it('returns 400 for insufficient stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliverySlot: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId, quantity: 999 }],
      })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/orders/:id/pay', () => {
  it('confirms a pending order', async () => {
    const order = await prisma.order.create({
      data: {
        userId,
        deliverySlot: new Date(Date.now() + 86400000).toISOString(),
        subtotal: 25,
        deliveryFee: 5,
        total: 30,
        status: 'PENDING',
        items: { create: [{ productId, quantity: 1, unitPrice: 25, options: '{}' }] },
      },
    })

    const res = await request(app)
      .post(`/api/orders/${order.id}/pay`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('CONFIRMED')
  })
})
