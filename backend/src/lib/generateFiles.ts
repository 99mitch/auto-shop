// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx')

export interface RecordData {
  nom?: string | null
  prenom?: string | null
  numero?: string | null
  dateNaissance?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
  email?: string | null
  iban?: string | null
  bic?: string | null
  bank?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function csvRow(fields: (string | null | undefined)[]): string {
  return fields.map((f) => {
    const s = f ?? ''
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')
}

function toE164French(n: string): string {
  const c = n.replace(/[\s\-\.\(\)]/g, '')
  if (c.startsWith('+')) return c
  if (c.startsWith('33') && c.length === 11) return '+' + c
  if (c.startsWith('0') && c.length === 10) return '+33' + c.slice(1)
  return c
}

function docHeader(type: string, lineCount: number, date: string, part?: { num: number; total: number }): string {
  const partStr = part ? ` • PARTIE ${part.num}/${part.total}` : ''
  return [
    '═══════════════════════════════════════',
    `EXTRACTION ${type} • ${date}`,
    `${lineCount} LIGNES${partStr}`,
    '═══════════════════════════════════════',
    '',
  ].join('\n')
}

// ─── Split utility ────────────────────────────────────────────────────────────

export function splitInto<T>(records: T[], linesPerFile: number): T[][] {
  if (linesPerFile <= 0 || linesPerFile >= records.length) return [records]
  const parts: T[][] = []
  for (let i = 0; i < records.length; i += linesPerFile) {
    parts.push(records.slice(i, i + linesPerFile))
  }
  return parts
}

// ─── BRUT (.txt, comma-separated) ────────────────────────────────────────────

export function generateBrut(
  records: RecordData[],
  type: 'FICHE' | 'NUMLIST' | 'MAILLIST',
  withNames: boolean,
  meta: { type: string; date: string; part?: { num: number; total: number } },
): string {
  let header: string
  let rows: string[]

  if (type === 'NUMLIST') {
    if (withNames) {
      header = csvRow(['nom', 'prenom', 'numero'])
      rows = records.map((r) => csvRow([r.nom, r.prenom, r.numero]))
    } else {
      header = 'numero'
      rows = records.map((r) => r.numero ?? '')
    }
  } else if (type === 'MAILLIST') {
    if (withNames) {
      header = csvRow(['nom', 'prenom', 'email'])
      rows = records.map((r) => csvRow([r.nom, r.prenom, r.email]))
    } else {
      header = 'email'
      rows = records.map((r) => r.email ?? '')
    }
  } else {
    header = csvRow(['nom', 'prenom', 'numero', 'date_naissance', 'adresse', 'code_postal', 'ville', 'email', 'iban', 'bic'])
    rows = records.map((r) => csvRow([r.nom, r.prenom, r.numero, r.dateNaissance, r.adresse, r.codePostal, r.ville, r.email, r.iban, r.bic]))
  }

  return docHeader(meta.type, records.length, meta.date, meta.part) + header + '\n' + rows.join('\n')
}

// ─── SPECIAL TXT (emoji format) ──────────────────────────────────────────────

export function generateSpecialTxt(
  records: RecordData[],
  meta: { type: string; date: string; part?: { num: number; total: number } },
): string {
  const currentYear = new Date().getFullYear()
  const separator = '\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n'

  const body = records.map((r) => {
    const parts: string[] = []

    const fullName = [r.prenom, r.nom].filter(Boolean).join(' ')
    if (fullName) { parts.push(`👤 ${fullName}`); parts.push('') }

    const hasIdentity = r.dateNaissance || r.ville || r.adresse || r.codePostal
    if (hasIdentity) {
      const lines: string[] = []
      if (r.dateNaissance) {
        const year = parseInt(r.dateNaissance.substring(0, 4))
        const age  = isNaN(year) ? null : currentYear - year
        lines.push(`┣ 🎂 Date de Naissance : ${r.dateNaissance}`)
        if (age) lines.push(`┣ 📆 Âge : ${age}`)
      }
      if (r.ville)      lines.push(`┣ 🏙️ Ville : ${r.ville}`)
      if (r.adresse)    lines.push(`┣ 🏠 Adresse : ${r.adresse}`)
      if (r.codePostal) lines.push(`┣ 📮 Code Postal : ${r.codePostal}`)
      if (lines.length) { lines[lines.length - 1] = lines[lines.length - 1].replace('┣', '┗') }
      parts.push(...lines); parts.push('')
    }

    const hasContact = r.email || r.numero
    if (hasContact) {
      parts.push('📱 Contact')
      if (r.email && r.numero) { parts.push(`┣ 📧 Email : ${r.email}`); parts.push(`┗ 📞 Téléphone : ${r.numero}`) }
      else if (r.email)  parts.push(`┗ 📧 Email : ${r.email}`)
      else               parts.push(`┗ 📞 Téléphone : ${r.numero}`)
      parts.push('')
    }

    const hasBank = r.bank || r.iban || r.bic
    if (hasBank) {
      parts.push('🏦 Banque')
      const bl: string[] = []
      if (r.bank) bl.push(`┣ 🏦 Nom : ${r.bank}`)
      if (r.iban) bl.push(`┣ 🏦 RIB : ${r.iban}`)
      if (r.bic)  bl.push(`┣ 🌐 BIC : ${r.bic}`)
      if (bl.length) { bl[bl.length - 1] = bl[bl.length - 1].replace('┣', '┗'); parts.push(...bl) }
    }

    return parts.join('\n')
  }).join(separator)

  return docHeader(meta.type, records.length, meta.date, meta.part) + body
}

// ─── SPECIAL XLSX ─────────────────────────────────────────────────────────────

export function generateSpecialXlsx(records: RecordData[]): string {
  const rows = records.map((r) => ({
    NUMBER: r.numero ? toE164French(r.numero) : '',
    NAME:   [r.prenom, r.nom].filter(Boolean).join(' '),
  }))

  const ws = XLSX.utils.json_to_sheet(rows, { header: ['NUMBER', 'NAME'] })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Extraction')

  // Column widths
  ws['!cols'] = [{ wch: 18 }, { wch: 36 }]

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return Buffer.from(buf).toString('base64')
}
