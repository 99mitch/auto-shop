interface RecordData {
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

function csvRow(fields: (string | null | undefined)[]): string {
  return fields.map((f) => {
    const s = f ?? ''
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }).join(',')
}

export function generateRawFile(
  records: RecordData[],
  type: 'FICHE' | 'NUMLIST' | 'MAILLIST',
  withNames: boolean,
): string {
  if (type === 'NUMLIST') {
    if (withNames) {
      const header = csvRow(['nom', 'prenom', 'numero'])
      const rows = records.map((r) => csvRow([r.nom, r.prenom, r.numero]))
      return [header, ...rows].join('\n')
    }
    return records.map((r) => r.numero ?? '').join('\n')
  }

  if (type === 'MAILLIST') {
    if (withNames) {
      const header = csvRow(['nom', 'prenom', 'email'])
      const rows = records.map((r) => csvRow([r.nom, r.prenom, r.email]))
      return [header, ...rows].join('\n')
    }
    return records.map((r) => r.email ?? '').join('\n')
  }

  // FICHE — full CSV
  const header = csvRow(['nom', 'prenom', 'numero', 'date_naissance', 'adresse', 'code_postal', 'ville', 'email', 'iban', 'bic'])
  const rows = records.map((r) =>
    csvRow([r.nom, r.prenom, r.numero, r.dateNaissance, r.adresse, r.codePostal, r.ville, r.email, r.iban, r.bic])
  )
  return [header, ...rows].join('\n')
}

export function generateSpecialFile(records: RecordData[]): string {
  const currentYear = new Date().getFullYear()

  return records.map((r, idx) => {
    const parts: string[] = []

    const fullName = [r.prenom, r.nom].filter(Boolean).join(' ')
    if (fullName) parts.push(`👤 ${fullName}`)
    parts.push('')

    const hasIdentity = r.dateNaissance || r.ville || r.adresse || r.codePostal
    if (hasIdentity) {
      const identityLines: string[] = []
      if (r.dateNaissance) {
        const year = parseInt(r.dateNaissance.substring(0, 4))
        const age = isNaN(year) ? null : currentYear - year
        identityLines.push(`┣ 🎂 Date de Naissance : ${r.dateNaissance}`)
        if (age) identityLines.push(`┣ 📆 Âge : ${age}`)
      }
      if (r.ville)      identityLines.push(`┣ 🏙️ Ville : ${r.ville}`)
      if (r.adresse)    identityLines.push(`┣ 🏠 Adresse : ${r.adresse}`)
      if (r.codePostal) {
        const last = identityLines.pop()!
        identityLines.push(last.replace('┣', '┣'))
        identityLines.push(`┗ 📮 Code Postal : ${r.codePostal}`)
      } else if (identityLines.length > 0) {
        identityLines[identityLines.length - 1] = identityLines[identityLines.length - 1].replace('┣', '┗')
      }
      parts.push(...identityLines)
      parts.push('')
    }

    const hasContact = r.email || r.numero
    if (hasContact) {
      parts.push('📱 Contact')
      if (r.email && r.numero) {
        parts.push(`┣ 📧 Email : ${r.email}`)
        parts.push(`┗ 📞 Téléphone : ${r.numero}`)
      } else if (r.email) {
        parts.push(`┗ 📧 Email : ${r.email}`)
      } else {
        parts.push(`┗ 📞 Téléphone : ${r.numero}`)
      }
      parts.push('')
    }

    const hasBank = r.bank || r.iban || r.bic
    if (hasBank) {
      parts.push('🏦 Banque')
      const bankLines: string[] = []
      if (r.bank) bankLines.push(`┣ 🏦 Nom : ${r.bank}`)
      if (r.iban) bankLines.push(`┣ 🏦 RIB : ${r.iban}`)
      if (r.bic)  bankLines.push(`┣ 🌐 BIC : ${r.bic}`)
      if (bankLines.length > 0) {
        bankLines[bankLines.length - 1] = bankLines[bankLines.length - 1].replace('┣', '┗')
        parts.push(...bankLines)
      }
    }

    return parts.join('\n') + (idx < records.length - 1 ? '\n\n━━━━━━━━━━━━━━━━━━━━━━\n' : '')
  }).join('\n')
}
