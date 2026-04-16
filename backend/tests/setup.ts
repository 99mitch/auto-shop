import path from 'path'

export const TEST_DB = path.join(__dirname, '..', 'test.db')

process.env.DATABASE_URL = `file:${TEST_DB}`
process.env.JWT_SECRET = 'test-secret-key'
process.env.BOT_TOKEN = 'test_bot_token'
process.env.ADMIN_IDS = '999999999'
process.env.MINI_APP_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
