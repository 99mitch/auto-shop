import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Deterministic RNG ────────────────────────────────────────────────────────
let _seed = 13337
function rand(max: number): number {
  _seed = (_seed * 1664525 + 1013904223) >>> 0
  return _seed % max
}
function pick<T>(arr: readonly T[]): T { return arr[rand(arr.length)] }
function randInt(min: number, max: number) { return min + rand(max - min + 1) }

// ─── Data pools ───────────────────────────────────────────────────────────────
const M_NAMES = ['Jean', 'Pierre', 'Nicolas', 'Thomas', 'Laurent', 'Julien', 'François', 'Antoine', 'Alexandre', 'Philippe', 'Patrick', 'Sébastien', 'Christophe', 'Stéphane', 'Maxime', 'Romain', 'Damien', 'Cédric', 'Frédéric', 'Mickael', 'David', 'Éric', 'Hervé', 'Olivier', 'Bruno'] as const
const F_NAMES = ['Marie', 'Sophie', 'Isabelle', 'Camille', 'Julie', 'Emma', 'Léa', 'Laura', 'Mathilde', 'Nathalie', 'Christine', 'Valérie', 'Sylvie', 'Sandrine', 'Céline', 'Aurélie', 'Virginie', 'Mélanie', 'Stéphanie', 'Lucie', 'Amandine', 'Élodie', 'Jessica', 'Pauline', 'Clara'] as const
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'] as const
const DEPTS = ['01', '06', '13', '17', '21', '25', '29', '31', '33', '34', '35', '37', '38', '42', '44', '45', '49', '51', '54', '57', '59', '62', '63', '67', '69', '75', '76', '77', '78', '80', '83', '84', '91', '92', '93', '94', '95'] as const
const BANKS = ['BNP PARIBAS', 'CREDIT AGRICOLE', 'SOCIETE GENERALE', 'LCLADV', 'CIC', 'CREDIT MUTUEL', 'LA BANQUE POSTALE', 'CAISSE EPARGNE', 'BANQUE POPULAIRE', 'HSBC', 'BRED', 'BOURSORAMA'] as const
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.fr', 'hotmail.fr', 'orange.fr', 'sfr.fr', 'free.fr', 'laposte.net', 'outlook.fr'] as const
const PHONE_PREFIX = ['06', '07'] as const

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
}
function genEmail(prenom: string, nom: string) {
  const p = normalize(prenom)
  const n = normalize(nom)
  const sep = pick(['.' as const, '_' as const, '' as const])
  const suffix = rand(100) > 70 ? String(randInt(1, 999)) : ''
  return `${p}${sep}${n}${suffix}@${pick(EMAIL_DOMAINS)}`
}
function genPhone() {
  return `${pick(PHONE_PREFIX)}${String(randInt(10000000, 99999999))}`
}
function genDob() {
  const year = randInt(1950, 2002)
  const month = String(randInt(1, 12)).padStart(2, '0')
  const day = String(randInt(1, 28)).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type RecordInput = {
  type: string
  gender: string
  dob: string
  department: string
  bank: string | null
  rawData: string
}

function genRecord(type: string): RecordInput {
  const gender = rand(2) === 0 ? 'M' : 'F'
  const prenom = gender === 'M' ? pick(M_NAMES) : pick(F_NAMES)
  const nom = pick(NOMS)
  const dept = pick(DEPTS)
  const dob = genDob()
  const bank = type === 'FICHE' ? pick(BANKS) : null

  const raw: Record<string, string | null> = { prenom, nom, gender, dob, department: dept }

  if (type === 'FICHE') {
    raw.email = genEmail(prenom, nom)
    raw.telephone = genPhone()
    raw.bank = bank
  } else if (type === 'NUMLIST') {
    raw.telephone = genPhone()
  } else {
    raw.email = genEmail(prenom, nom)
  }

  return { type, gender, dob, department: dept, bank, rawData: JSON.stringify(raw) }
}

// ─── File definitions ─────────────────────────────────────────────────────────
const FILE_DEFS: { name: string; type: string; count: number; daysAgo: number }[] = [
  // FICHE
  { name: 'BASE_FICHE_AMELI_FR_2024_Q1.csv',       type: 'FICHE',    count: 148, daysAgo: 90 },
  { name: 'BASE_FICHE_AMELI_FR_2024_Q2.csv',       type: 'FICHE',    count: 163, daysAgo: 60 },
  { name: 'FICHE_LEAK_SFR_NATIONAL_2024.csv',      type: 'FICHE',    count: 112, daysAgo: 45 },
  { name: 'BASE_FICHE_AMAZON_FR_2023.csv',         type: 'FICHE',    count: 197, daysAgo: 180 },
  { name: 'FICHE_CPAM_IDF_2024.csv',               type: 'FICHE',    count: 134, daysAgo: 30 },
  { name: 'BASE_FICHE_ORANGE_FR_2024.csv',         type: 'FICHE',    count:  98, daysAgo: 20 },
  { name: 'FICHE_LEAK_CELIO_2023.csv',             type: 'FICHE',    count:  76, daysAgo: 200 },
  { name: 'BASE_FICHE_FNAC_FR_2024.csv',           type: 'FICHE',    count: 121, daysAgo: 15 },
  // NUMLIST
  { name: 'NUMS_FR_IDF_2024_BATCH01.csv',          type: 'NUMLIST',  count: 243, daysAgo: 50 },
  { name: 'NUMS_FR_SUD_2024_BATCH01.csv',          type: 'NUMLIST',  count: 187, daysAgo: 55 },
  { name: 'NUMLIST_ORANGE_FR_2024.csv',            type: 'NUMLIST',  count: 312, daysAgo: 35 },
  { name: 'NUMLIST_SFR_FR_2024.csv',               type: 'NUMLIST',  count: 276, daysAgo: 40 },
  { name: 'NUMS_FR_NORD_2024.csv',                 type: 'NUMLIST',  count: 159, daysAgo: 70 },
  { name: 'NUMLIST_FREE_MOBILE_2024.csv',          type: 'NUMLIST',  count: 228, daysAgo: 25 },
  // MAILLIST
  { name: 'MAILS_GAMING_FR_2024.csv',              type: 'MAILLIST', count: 175, daysAgo: 65 },
  { name: 'MAILLIST_ECOMMERCE_FR_2024_Q1.csv',     type: 'MAILLIST', count: 234, daysAgo: 80 },
  { name: 'MAILLIST_ECOMMERCE_FR_2024_Q2.csv',     type: 'MAILLIST', count: 198, daysAgo: 40 },
  { name: 'MAILS_FORUM_FR_2023.csv',               type: 'MAILLIST', count: 143, daysAgo: 210 },
  { name: 'MAILLIST_STREAMING_FR_2024.csv',        type: 'MAILLIST', count: 267, daysAgo: 18 },
  { name: 'MAILS_RETAIL_FR_2024.csv',              type: 'MAILLIST', count: 156, daysAgo: 55 },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const existing = await prisma.dataFile.count()
  if (existing > 0) {
    console.log(`Donnees seed already present (${existing} files). Skipping.`)
    return
  }

  console.log(`Seeding ${FILE_DEFS.length} data files...`)

  let totalRecords = 0
  for (const def of FILE_DEFS) {
    const uploadedAt = new Date(Date.now() - def.daysAgo * 86_400_000)
    const records = Array.from({ length: def.count }, () => genRecord(def.type))

    const file = await prisma.dataFile.create({
      data: {
        name: def.name,
        type: def.type,
        rowCount: def.count,
        uploadedAt,
        records: { createMany: { data: records } },
      },
    })

    totalRecords += def.count
    console.log(`  ✓ ${file.name} — ${def.count} records`)
  }

  console.log(`\nDone: ${FILE_DEFS.length} files, ${totalRecords} records total`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
