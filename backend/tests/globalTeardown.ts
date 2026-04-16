import { existsSync, unlinkSync } from 'fs'
import path from 'path'

const TEST_DB = path.join(__dirname, '..', 'test.db')

export default async function globalTeardown() {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  if (existsSync(`${TEST_DB}-journal`)) unlinkSync(`${TEST_DB}-journal`)
}
