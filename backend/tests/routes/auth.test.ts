import '../setup'
import request from 'supertest'
import crypto from 'crypto'
import { app } from '../../src/app'
import { prisma } from '../../src/prisma'

function buildInitData(user: object): string {
  const botToken = process.env.BOT_TOKEN!
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
  })
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  params.set('hash', hash)
  return params.toString()
}

afterEach(async () => {
  await prisma.address.deleteMany()
  await prisma.user.deleteMany()
})

describe('POST /api/auth/init', () => {
  it('returns token and user for valid initData', async () => {
    const user = { id: 111222333, first_name: 'Test', username: 'testuser' }
    const initData = buildInitData(user)

    const res = await request(app)
      .post('/api/auth/init')
      .set('X-Telegram-Init-Data', initData)

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.telegramId).toBe('111222333')
    expect(res.body.isAdmin).toBe(false)
  })

  it('returns 400 when header is missing', async () => {
    const res = await request(app).post('/api/auth/init')
    expect(res.status).toBe(400)
  })

  it('returns 401 for invalid initData', async () => {
    const res = await request(app)
      .post('/api/auth/init')
      .set('X-Telegram-Init-Data', 'invalid=data&hash=badhash')
    expect(res.status).toBe(401)
  })

  it('upserts user on repeated calls', async () => {
    const user = { id: 444555666, first_name: 'Repeat', username: 'repeat' }
    const initData = buildInitData(user)

    await request(app).post('/api/auth/init').set('X-Telegram-Init-Data', initData)
    await request(app).post('/api/auth/init').set('X-Telegram-Init-Data', initData)

    const count = await prisma.user.count({ where: { telegramId: '444555666' } })
    expect(count).toBe(1)
  })
})
