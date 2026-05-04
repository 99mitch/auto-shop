const BIC_PREFIX: Record<string, string> = {
  BNPA: 'BNP PARIBAS',
  AGRI: 'CREDIT AGRICOLE',
  SOGE: 'SOCIETE GENERALE',
  LCLF: 'LCL',
  CMCI: 'CIC',
  CMCR: 'CIC',
  CMUT: 'CREDIT MUTUEL',
  CMBR: 'CREDIT MUTUEL',
  CMBS: 'CREDIT MUTUEL',
  CMBA: 'CREDIT MUTUEL',
  PSST: 'LA BANQUE POSTALE',
  CEPA: 'CAISSE EPARGNE',
  CCBP: 'BANQUE POPULAIRE',
  BPCE: 'BANQUE POPULAIRE',
  BRED: 'BRED',
  CCFR: 'HSBC FRANCE',
  HSBC: 'HSBC FRANCE',
  NORD: 'CREDIT DU NORD',
  CRDN: 'CREDIT DU NORD',
  BPAL: 'PALATINE',
  AXAB: 'AXA BANQUE',
  BOUR: 'BOURSORAMA',
  HELO: 'HELLO BANK',
  FORT: 'FORTUNEO',
  INGB: 'ING',
  MONA: 'MONABANQ',
  OLBP: 'ORANGE BANK',
  BNGL: 'ORANGE BANK',
  FLOA: 'FLOA BANK',
  REVO: 'REVOLUT',
  N26D: 'N26',
  NICA: 'NICKEL',
  QNTO: 'QONTO',
  LYDI: 'LYDIA',
  SUME: 'SUMERIA',
  SHIN: 'SHINE',
  BUNQ: 'BUNQ',
  TRWI: 'WISE',
  PIXP: 'PIXPAY',
  KARD: 'KARD',
  GREE: 'GREEN GOT',
  ANYT: 'ANYTIME',
  VYBE: 'VYBE',
  PAYS: 'PAYSERA',
  MONE: 'MONESE',
  CETE: 'CETELEM',
  COFI: 'COFIDIS',
  SOFI: 'SOFINCO',
  FRAN: 'FRANFINANCE',
}

// French IBAN bank codes (positions 4–8 after "FR")
const IBAN_CODE: Record<string, string> = {
  '10011': 'BNP PARIBAS',
  '10096': 'BNP PARIBAS',
  '30002': 'SOCIETE GENERALE',
  '30003': 'SOCIETE GENERALE',
  '30004': 'LCL',
  '30056': 'LA BANQUE POSTALE',
  '30066': 'CREDIT DU NORD',
  '30076': 'CREDIT DU NORD',
  '13007': 'CIC',
  '15589': 'CIC',
  '15890': 'CIC',
  '13335': 'HSBC FRANCE',
  '13360': 'HSBC FRANCE',
  '10278': 'CREDIT AGRICOLE',
  '10207': 'CREDIT AGRICOLE',
  '10107': 'CREDIT AGRICOLE',
  '18206': 'CAISSE EPARGNE',
  '17515': 'BANQUE POPULAIRE',
  '11306': 'CREDIT MUTUEL',
  '11315': 'CREDIT MUTUEL',
  '12548': 'CREDIT MUTUEL',
  '42559': 'BOURSORAMA',
  '10057': 'ING',
  '20041': 'LA BANQUE POSTALE',
}

export function detectBank(bic?: string | null, iban?: string | null): string | null {
  if (bic && bic.length >= 4) {
    const prefix = bic.toUpperCase().substring(0, 4)
    if (BIC_PREFIX[prefix]) return BIC_PREFIX[prefix]
  }
  if (iban) {
    const raw = iban.replace(/\s/g, '').toUpperCase()
    if (raw.startsWith('FR') && raw.length >= 9) {
      const code = raw.substring(4, 9)
      if (IBAN_CODE[code]) return IBAN_CODE[code]
    }
  }
  return null
}
