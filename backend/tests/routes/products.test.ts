import '../setup'
import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/prisma'
import { signJwt } from '../../src/lib/jwt'

let token: string
let categoryId: number

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { telegramId: '777888999', firstName: 'Test' },
  })
  token = signJwt({ userId: user.id, telegramId: user.telegramId })

  const cat = await prisma.category.create({ data: { slug: 'test-cat', name: 'Test', order: 99 } })
  categoryId = cat.id

  await prisma.product.createMany({
    data: [
      { name: 'Rose Test', description: 'desc', price: 10, stock: 5, imageUrl: 'https://picsum.photos/1', images: '[]', categoryId },
      { name: 'Tulipe Test', description: 'desc', price: 20, stock: 0, imageUrl: 'https://picsum.photos/2', images: '[]', categoryId },
      { name: 'Inactive', description: 'desc', price: 5, stock: 3, imageUrl: 'https://picsum.photos/3', images: '[]', categoryId, isActive: false },
    ],
  })
})

afterAll(async () => {
  await prisma.product.deleteMany({ where: { categoryId } })
  await prisma.category.delete({ where: { id: categoryId } })
  await prisma.user.deleteMany({ where: { telegramId: '777888999' } })
})

describe('GET /api/products', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })

  it('returns only active products', async () => {
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    const names = res.body.map((p: any) => p.name)
    expect(names).toContain('Rose Test')
    expect(names).not.toContain('Inactive')
  })

  it('filters by search query', async () => {
    const res = await request(app)
      .get('/api/products?search=Tulipe')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.some((p: any) => p.name === 'Tulipe Test')).toBe(true)
    expect(res.body.every((p: any) => p.name.includes('Tulipe') || p.name.includes('tulipe'))).toBe(true)
  })

  it('returns images as array', async () => {
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`)
    expect(Array.isArray(res.body[0].images)).toBe(true)
  })
})

describe('GET /api/products/:id', () => {
  it('returns 404 for inactive product', async () => {
    const inactive = await prisma.product.findFirst({ where: { name: 'Inactive', categoryId } })
    const res = await request(app)
      .get(`/api/products/${inactive!.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
