/**
 * Import CSV files from /var/www/auto-shop-data/donnees/
 * Usage: DATABASE_URL=file:... npx tsx src/scripts/import-donnees.ts [file.csv]
 *
 * CSV columns (any subset): nom,prenom,numero,date_naissance,adresse,code_postal,ville,email,iban,bic
 * Category rules:
 *   FICHE   → nom + prenom + numero all non-empty
 *   NUMLIST → numero non-empty
 *   MAILLIST→ email non-empty
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { prisma } from '../prisma'
import { detectBank } from '../lib/bankLookup'
import { detectGender } from '../lib/genderLookup'

const DONNEES_DIR = process.env.DONNEES_DIR ?? '/var/www/auto-shop-data/donnees'

const COL_MAP: Record<string, string> = {
  nom: 'nom', prenom: 'prenom', numero: 'numero',
  date_naissance: 'dateNaissance', adresse: 'adresse',
  code_postal: 'codePostal', ville: 'ville',
  email: 'email', iban: 'iban', bic: 'bic',
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function departmentFromPostal(cp?: string): string | null {
  if (!cp) return null
  const digits = cp.replace(/\s/g, '')
  if (digits.length < 2) return null
  const prefix = digits.substring(0, 2)
  // Corsica & DOM-TOM handled as-is
  return prefix
}

async function importFile(filePath: string) {
  const filename = path.basename(filePath, '.csv')
  console.log(`\n→ Importing: ${filename}`)

  const existing = await prisma.dataFile.findUnique({ where: { name: filename } })
  if (existing) {
    console.log(`  Skipped (already imported)`)
    return
  }

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let headers: string[] = []
  let colIndex: Record<string, number> = {}
  const records: Parameters<typeof prisma.dataRecord.createMany>[0]['data'] = []

  let ficheCount = 0, numlistCount = 0, maillistCount = 0

  for await (const rawLine of rl) {
    const line = rawLine.trim()
    if (!line) continue

    if (headers.length === 0) {
      headers = parseCSVLine(line.toLowerCase())
      headers.forEach((h, i) => { if (COL_MAP[h]) colIndex[COL_MAP[h]] = i })
      continue
    }

    const cols = parseCSVLine(line)
    const get = (field: string): string | null => {
      const idx = colIndex[field]
      if (idx === undefined) return null
      const v = cols[idx]?.trim() ?? ''
      return v || null
    }

    const nom = get('nom')
    const prenom = get('prenom')
    const numero = get('numero')
    const dateNaissance = get('dateNaissance')
    const adresse = get('adresse')
    const codePostal = get('codePostal')
    const ville = get('ville')
    const email = get('email')
    const iban = get('iban')
    const bic = get('bic')

    const inFiche = !!(nom && prenom && numero)
    const inNumlist = !!numero
    const inMaillist = !!email

    if (!inFiche && !inNumlist && !inMaillist) continue

    if (inFiche) ficheCount++
    if (inNumlist) numlistCount++
    if (inMaillist) maillistCount++

    records.push({
      fileId: 0, // placeholder, set after DataFile creation
      nom, prenom, numero, dateNaissance, adresse, codePostal, ville, email, iban, bic,
      bank: detectBank(bic, iban),
      gender: detectGender(prenom),
      department: departmentFromPostal(codePostal ?? undefined),
      inFiche, inNumlist, inMaillist,
    })
  }

  if (records.length === 0) {
    console.log(`  No valid records found, skipping`)
    return
  }

  const hasCol = (field: string) => field in colIndex

  const dataFile = await prisma.dataFile.create({
    data: {
      name: filename,
      hasNom: hasCol('nom'),
      hasPrenom: hasCol('prenom'),
      hasNumero: hasCol('numero'),
      hasDob: hasCol('dateNaissance'),
      hasAdresse: hasCol('adresse'),
      hasCodePostal: hasCol('codePostal'),
      hasVille: hasCol('ville'),
      hasEmail: hasCol('email'),
      hasIban: hasCol('iban'),
      hasBic: hasCol('bic'),
      ficheCount,
      numlistCount,
      maillistCount,
    },
  })

  // Set real fileId and insert in batches of 500
  const BATCH = 500
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map((r) => ({ ...r, fileId: dataFile.id }))
    await prisma.dataRecord.createMany({ data: batch })
  }

  console.log(`  Done: ${ficheCount} fiche / ${numlistCount} numlist / ${maillistCount} maillist`)
}

async function main() {
  const targetFile = process.argv[2]

  if (targetFile) {
    await importFile(path.resolve(targetFile))
  } else {
    if (!fs.existsSync(DONNEES_DIR)) {
      console.log(`Directory not found: ${DONNEES_DIR}`)
      process.exit(0)
    }
    const files = fs.readdirSync(DONNEES_DIR).filter((f) => f.endsWith('.csv'))
    if (files.length === 0) {
      console.log('No CSV files found in', DONNEES_DIR)
      process.exit(0)
    }
    for (const f of files) {
      await importFile(path.join(DONNEES_DIR, f))
    }
  }

  await prisma.$disconnect()
  console.log('\nImport complete.')
}

main().catch((e) => { console.error(e); process.exit(1) })
