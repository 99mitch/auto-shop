import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'

const TEST_DB = path.join(__dirname, '..', 'test.db')

export default async function globalSetup() {
  process.env.DATABASE_URL = `file:${TEST_DB}`
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  if (existsSync(`${TEST_DB}-journal`)) unlinkSync(`${TEST_DB}-journal`)
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
    stdio: 'pipe',
  })
}
