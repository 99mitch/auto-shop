import crypto from 'crypto'
import { validateInitData } from '../../src/lib/telegram'

const BOT_TOKEN = 'test_token_12345'

function buildInitData(user: object, botToken: string): string {
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

describe('validateInitData', () => {
  const user = { id: 123456, first_name: 'Alice', username: 'alice' }

  it('returns user object for valid initData', () => {
    const initData = buildInitData(user, BOT_TOKEN)
    const result = validateInitData(initData, BOT_TOKEN)
    expect(result.id).toBe(user.id)
    expect(result.first_name).toBe(user.first_name)
  })

  it('throws for invalid hash', () => {
    const initData = buildInitData(user, BOT_TOKEN)
    expect(() => validateInitData(initData, 'wrong_token')).toThrow('Invalid initData hash')
  })

  it('throws when hash is missing', () => {
    const params = new URLSearchParams({ user: JSON.stringify(user), auth_date: '1234567890' })
    expect(() => validateInitData(params.toString(), BOT_TOKEN)).toThrow('Missing hash')
  })
})
