import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Category } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'
type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'
type CardType = 'DEBIT' | 'CREDIT'
type CardDevice = 'IPHONE' | 'ANDROID' | 'UNKNOWN'
type CardSource = 'AMELI' | 'MONDIAL_RELAY' | 'AMAZON' | 'OTHER'

interface CardMeta {
  bin: string; bank: string; network: CardNetwork; level: CardLevel
  type: CardType; device: CardDevice; source: CardSource
  recoveryDate: string; ddn: string; cp: string; age: string
}

interface CardForm {
  bin: string; bank: string; level: CardLevel; network: CardNetwork
  cardType: CardType; device: CardDevice; source: CardSource
  ddn: string; recoveryDate: string; prix: string; stock: string
  cp: string; age: string; categoryId: number
}

interface CollabProduct {
  id: number; name: string; description: string; price: number
  costEur: number | null; stock: number; imageUrl: string
  isActive: boolean; categoryId: number | null; collaboratorId: number | null
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD = '#fbbf24'
const DANGER = '#ef4444'
const SUCCESS = '#4ade80'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)',
  fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' as const,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13,
  fontFamily: '"JetBrains Mono", monospace', outline: 'none', boxSizing: 'border-box' as const,
}

const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']
const NETWORKS: CardNetwork[] = ['VISA', 'MASTERCARD', 'AMEX', 'OTHER']
const CARD_TYPES: CardType[] = ['DEBIT', 'CREDIT']
const DEVICES: CardDevice[] = ['IPHONE', 'ANDROID', 'UNKNOWN']
const SOURCES: CardSource[] = ['AMELI', 'MONDIAL_RELAY', 'AMAZON', 'OTHER']

const LEVEL_COLORS: Record<CardLevel, { bg: string; text: string; border: string }> = {
  CLASSIC:  { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  GOLD:     { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  PLATINUM: { bg: 'rgba(229,231,235,0.12)', text: '#e5e7eb', border: 'rgba(229,231,235,0.3)' },
  BLACK:    { bg: 'rgba(255,255,255,0.06)', text: '#fff',    border: 'rgba(255,255,255,0.18)' },
}
const NETWORK_COLORS: Record<CardNetwork, { bg: string; text: string; border?: string }> = {
  VISA:       { bg: 'rgba(129,140,248,0.15)', text: '#818cf8' },
  MASTERCARD: { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  AMEX:       { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  OTHER:      { bg: 'rgba(156,163,175,0.1)',  text: 'rgba(156,163,175,0.6)' },
}
const TYPE_COLORS: Record<CardType, { bg: string; text: string; border?: string }> = {
  DEBIT:  { bg: 'rgba(250,204,21,0.15)', text: '#facc15' },
  CREDIT: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
}
const DEVICE_COLORS: Record<CardDevice, { bg: string; text: string; border?: string }> = {
  IPHONE:  { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
  ANDROID: { bg: 'rgba(34,211,238,0.15)',  text: '#22d3ee' },
  UNKNOWN: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
}
const SOURCE_COLORS: Record<CardSource, { bg: string; text: string; border?: string }> = {
  AMELI:         { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  MONDIAL_RELAY: { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  AMAZON:        { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  OTHER:         { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
}

function parseCardMeta(description: string): CardMeta {
  const d: CardMeta = { bin: '', bank: '', network: 'OTHER', level: 'CLASSIC', type: 'CREDIT', device: 'UNKNOWN', source: 'OTHER', recoveryDate: '', ddn: '', cp: '', age: '' }
  try {
    const m = JSON.parse(description || '{}')
    const b0 = (m.bin || '')[0]
    const autoNetwork: CardNetwork = b0 === '4' ? 'VISA' : b0 === '5' ? 'MASTERCARD' : b0 === '3' ? 'AMEX' : 'OTHER'
    const tags: string[] = m.tags ?? []
    return {
      bin: m.bin ?? '', bank: m.bank ?? '',
      network: m.network ?? autoNetwork,
      level: m.level ?? 'CLASSIC',
      type: m.type ?? (tags.includes('CREDIT') ? 'CREDIT' : 'DEBIT'),
      device: m.device ?? (tags.includes('IPHONE') ? 'IPHONE' : tags.includes('ANDROID') ? 'ANDROID' : 'UNKNOWN'),
      source: m.source ?? (tags.includes('AMELI') ? 'AMELI' : tags.includes('MONDIAL_RELAY') ? 'MONDIAL_RELAY' : tags.includes('AMAZON') ? 'AMAZON' : 'OTHER'),
      recoveryDate: m.recoveryDate ?? '', ddn: m.ddn ?? '',
      cp: m.cp ?? '', age: m.age ? String(m.age) : '',
    }
  } catch { return d }
}

const emptyCardForm = (): CardForm => ({
  bin: '', bank: '', level: 'CLASSIC', network: 'OTHER', cardType: 'CREDIT',
  device: 'UNKNOWN', source: 'OTHER', ddn: '', recoveryDate: '',
  prix: '', stock: '1', cp: '', age: '', categoryId: 0,
})

function buildProductPayload(form: CardForm) {
  return {
    name: `${form.bank || 'Carte'} ${form.network} ${form.level}`,
    description: JSON.stringify({
      bin: form.bin, bank: form.bank, network: form.network, level: form.level,
      type: form.cardType, device: form.device, source: form.source,
      recoveryDate: form.recoveryDate, ddn: form.ddn, cp: form.cp, age: form.age,
    }),
    costEur: parseFloat(form.prix),
    stock: parseInt(form.stock) || 0,
    categoryId: form.categoryId || undefined,
    imageUrl: form.bin.length >= 6 ? `https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png` : '',
    images: [],
  }
}

// ── Client-side card parser ────────────────────────────────────────────────────
function clientParseCard(raw: string): { numero?: string; titulaire?: string; expiration?: string; email?: string } {
  const line = raw.trim()
  const result: { numero?: string; titulaire?: string; expiration?: string; email?: string } = {}
  try { const j = JSON.parse(line); if (j.numero) return j } catch {}
  const parts = line.split('|').map((p: string) => p.trim())
  if (parts.length >= 3) {
    if (/^\d{13,19}$/.test(parts[0])) result.numero = parts[0]
    if (/^\d{2}\/\d{2,4}$/.test(parts[1])) result.expiration = parts[1]
    if (parts[3]) result.titulaire = parts[3]
  } else {
    const m = line.match(/\b\d{13,19}\b/); if (m) result.numero = m[0]
    const e = line.match(/\b\d{2}\/\d{2,4}\b/); if (e) result.expiration = e[0]
  }
  const em = line.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/); if (em) result.email = em[0]
  return result
}

function maskPan(n?: string) {
  if (!n) return '???'
  return '●●●● ●●●● ●●●● ' + n.slice(-4)
}

// ── Add-new page: upload-first (TXT or Bot) ────────────────────────────────────
function AddNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'file' | 'bot'>('file')
  const [prix, setPrix] = useState('')
  const [parsed, setParsed] = useState<{ raw: string; meta: ReturnType<typeof clientParseCard> }[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<{ added: number; stock: number } | null>(null)
  const [createdProductId, setCreatedProductId] = useState<number | null>(null)
  const [botReady, setBotReady] = useState(false)

  const { data: botPending, refetch: refetchPending } = useQuery<{ productId: number; count: number; preview: string[] } | null>({
    queryKey: ['bot-upload-pending'],
    queryFn: () => api.get('/api/collab/products/bot-upload').then(r => r.data),
    enabled: mode === 'bot' && botReady,
    refetchInterval: 3000,
  })

  const pendingCards = botPending && createdProductId && botPending.productId === createdProductId ? botPending : null

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null); setParsed(null); setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').map(l => l.trim()).filter(l => l && /\d{13,19}/.test(l))
      if (lines.length === 0) { setErr('Aucune carte détectée dans le fichier.'); return }
      setParsed(lines.map(raw => ({ raw, meta: clientParseCard(raw) })))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const createProduct = useMutation({
    mutationFn: (body: object) => api.post('/api/collab/products', body).then(r => r.data),
  })

  const uploadBulk = useMutation({
    mutationFn: ({ productId, lines }: { productId: number; lines: string[] }) =>
      api.post(`/api/collab/products/${productId}/inventory/bulk`, { lines }).then(r => r.data),
    onSuccess: (data) => {
      setResult(data); setParsed(null); setErr(null)
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
    },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Erreur upload'),
  })

  const startBotSession = useMutation({
    mutationFn: (productId: number) =>
      api.post(`/api/collab/products/${productId}/inventory/bot-session`).then(r => r.data),
    onSuccess: () => { setBotReady(true); setErr(null) },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Erreur session bot'),
  })

  const confirmBot = useMutation({
    mutationFn: () => api.post('/api/collab/products/bot-upload/confirm').then(r => r.data),
    onSuccess: (data) => {
      setResult(data); setBotReady(false); refetchPending()
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
    },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Erreur confirmation'),
  })

  const cancelBot = useMutation({
    mutationFn: () => api.delete('/api/collab/products/bot-upload').then(r => r.data),
    onSuccess: () => { setBotReady(false); setCreatedProductId(null); refetchPending() },
  })

  async function handleConfirmFile() {
    if (!parsed) return
    if (!prix || isNaN(parseFloat(prix)) || parseFloat(prix) <= 0) {
      setErr('Saisis ton prix (€) avant de confirmer.'); return
    }
    setErr(null)
    try {
      const firstCard = parsed[0]?.meta
      const bin = firstCard?.numero?.slice(0, 6) ?? ''
      const b0 = bin[0]
      const network: CardNetwork = b0 === '4' ? 'VISA' : b0 === '5' ? 'MASTERCARD' : b0 === '3' ? 'AMEX' : 'OTHER'
      const product = await createProduct.mutateAsync({
        name: `Carte ${network} (${parsed.length} cartes)`,
        description: JSON.stringify({ bin, network }),
        costEur: parseFloat(prix),
        stock: 0,
        imageUrl: bin.length >= 6 ? `https://cardimages.imaginecurve.com/cards/${bin}.png` : '',
        images: [],
      })
      await uploadBulk.mutateAsync({ productId: product.id, lines: parsed.map(c => c.raw) })
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Erreur lors de la création')
    }
  }

  async function handleActivateBot() {
    if (!prix || isNaN(parseFloat(prix)) || parseFloat(prix) <= 0) {
      setErr('Saisis ton prix (€) avant d\'activer le bot.'); return
    }
    setErr(null)
    try {
      const product = await createProduct.mutateAsync({
        name: 'Carte via Bot',
        description: JSON.stringify({}),
        costEur: parseFloat(prix),
        stock: 0,
        imageUrl: '',
        images: [],
      })
      setCreatedProductId(product.id)
      await startBotSession.mutateAsync(product.id)
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Erreur lors de la création')
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '18px 10px', borderRadius: 12,
    background: active ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? GOLD : 'rgba(255,255,255,0.3)',
    cursor: 'pointer', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 8, transition: 'all 0.15s',
  })

  const isPending = createProduct.isPending || uploadBulk.isPending || startBotSession.isPending || confirmBot.isPending

  if (result) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div style={{ ...BEBAS, fontSize: 22, color: '#fff', letterSpacing: '0.06em', textAlign: 'center' }}>
          {result.added} CARTE{result.added !== 1 ? 'S' : ''} AJOUTÉE{result.added !== 1 ? 'S' : ''}
        </div>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Stock disponible : {result.stock}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
          Tu peux compléter les infos du produit<br/>(banque, BIN, niveau…) via MODIFIER.
        </div>
        <button
          onClick={() => navigate('/collab')}
          style={{ marginTop: 8, padding: '12px 32px', borderRadius: 10, background: GOLD, border: 'none', color: '#050505', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer' }}
        >
          RETOUR AU TABLEAU DE BORD
        </button>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap'); * { box-sizing: border-box; }`}</style>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/collab')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>NOUVEAU PRODUIT</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Prix */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
          <div style={{ ...LABEL_STYLE, color: 'rgba(251,191,36,0.5)', marginBottom: 10 }}>MON PRIX PAR CARTE (€)</div>
          <input
            style={{ ...INPUT_STYLE, fontSize: 20, padding: '12px 14px', border: `1px solid ${prix && parseFloat(prix) > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}` }}
            type="number"
            value={prix}
            onChange={e => { setPrix(e.target.value); setErr(null) }}
            placeholder="15"
            inputMode="decimal"
            disabled={isPending || botReady}
          />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', ...MONO, marginTop: 6 }}>
            Tu recevras ce montant à chaque vente de carte.
          </div>
        </div>

        {/* Choix du mode (seulement si pas encore en session bot) */}
        {!botReady && !parsed && (
          <div>
            <div style={{ ...LABEL_STYLE, marginBottom: 10, paddingLeft: 2 }}>COMMENT AJOUTER TES CARTES ?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={tabStyle(mode === 'file')} onClick={() => { setMode('file'); setErr(null) }}>
                <span style={{ fontSize: 32 }}>📄</span>
                <span style={{ ...BEBAS, fontSize: 13, letterSpacing: '0.1em' }}>FICHIER TXT</span>
                <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>
                  Importe un fichier<br/>avec tes cartes
                </span>
              </button>
              <button style={tabStyle(mode === 'bot')} onClick={() => { setMode('bot'); setErr(null) }}>
                <span style={{ fontSize: 32 }}>🤖</span>
                <span style={{ ...BEBAS, fontSize: 13, letterSpacing: '0.1em' }}>VIA TELEGRAM</span>
                <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>
                  Envoie tes cartes<br/>au bot
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Mode fichier TXT : zone de dépôt ── */}
        {mode === 'file' && !parsed && (
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '24px 16px', borderRadius: 14,
            border: '1px dashed rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.02)',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 28 }}>📄</span>
            <span style={{ fontSize: 12, ...BEBAS, letterSpacing: '0.1em', color: GOLD }}>CHOISIR UN FICHIER .TXT</span>
            <span style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Format : pan|expiry|cvv|titulaire|ddn|adresse|ville|email|tel|ip
            </span>
            <input type="file" accept=".txt,text/plain" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        )}

        {/* ── Récap fichier ── */}
        {mode === 'file' && parsed && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
            <div style={{ fontSize: 11, ...MONO, color: SUCCESS, marginBottom: 10 }}>
              ✅ {parsed.length} carte{parsed.length > 1 ? 's' : ''} détectée{parsed.length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
              {parsed.map((c, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, ...MONO, color: '#fff' }}>{maskPan(c.meta.numero)}</div>
                  <div style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {[c.meta.titulaire, c.meta.expiration, c.meta.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirmFile}
                disabled={isPending}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9, background: isPending ? 'rgba(251,191,36,0.3)' : GOLD, border: 'none', color: '#050505', fontSize: 13, ...BEBAS, letterSpacing: '0.1em', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                {isPending ? '...' : `✅ CONFIRMER (${parsed.length} cartes)`}
              </button>
              <button
                onClick={() => setParsed(null)}
                disabled={isPending}
                style={{ padding: '11px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 13, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}
              >
                ✗
              </button>
            </div>
          </div>
        )}

        {/* ── Mode bot : activation ── */}
        {mode === 'bot' && !botReady && !pendingCards && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>🤖</span>
            <span style={{ fontSize: 11, ...MONO, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7 }}>
              Le bot Telegram se mettra en attente.<br/>Envoie tes cartes directement dans le chat.
            </span>
            <button
              onClick={handleActivateBot}
              disabled={isPending}
              style={{ padding: '11px 28px', borderRadius: 10, background: isPending ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)', color: GOLD, fontSize: 13, ...BEBAS, letterSpacing: '0.1em', cursor: isPending ? 'not-allowed' : 'pointer' }}
            >
              {isPending ? '...' : '🤖 ACTIVER LE BOT'}
            </button>
          </div>
        )}

        {/* ── Bot en attente de cartes ── */}
        {mode === 'bot' && botReady && !pendingCards && (
          <div style={{ background: '#111', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 14, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SUCCESS, boxShadow: `0 0 10px ${SUCCESS}` }} />
            <span style={{ fontSize: 12, ...MONO, color: SUCCESS }}>BOT EN ATTENTE…</span>
            <span style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.7 }}>
              Envoie tes cartes dans le chat Telegram.<br/>La page se mettra à jour automatiquement.
            </span>
            <button
              onClick={() => cancelBot.mutate()}
              style={{ marginTop: 4, padding: '7px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: DANGER, fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}
            >
              ANNULER
            </button>
          </div>
        )}

        {/* ── Récap bot ── */}
        {mode === 'bot' && pendingCards && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
            <div style={{ fontSize: 11, ...MONO, color: SUCCESS, marginBottom: 10 }}>
              ✅ {pendingCards.count} carte{pendingCards.count > 1 ? 's' : ''} reçue{pendingCards.count > 1 ? 's' : ''} via Telegram
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto', marginBottom: 12 }}>
              {pendingCards.preview.map((raw, i) => {
                const m = clientParseCard(raw)
                return (
                  <div key={i} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, ...MONO, color: '#fff' }}>{maskPan(m.numero)}</div>
                    <div style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {[m.titulaire, m.expiration, m.email].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )
              })}
              {pendingCards.count > 5 && (
                <div style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '4px 0' }}>
                  …et {pendingCards.count - 5} autre{pendingCards.count - 5 > 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => confirmBot.mutate()}
                disabled={confirmBot.isPending}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9, background: confirmBot.isPending ? 'rgba(251,191,36,0.3)' : GOLD, border: 'none', color: '#050505', fontSize: 13, ...BEBAS, letterSpacing: '0.1em', cursor: confirmBot.isPending ? 'not-allowed' : 'pointer' }}
              >
                {confirmBot.isPending ? '...' : `✅ CONFIRMER (${pendingCards.count} cartes)`}
              </button>
              <button
                onClick={() => cancelBot.mutate()}
                style={{ padding: '11px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 13, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}
              >
                ✗
              </button>
            </div>
          </div>
        )}

        {err && (
          <div style={{ fontSize: 10, ...MONO, color: DANGER, padding: '8px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { display: none; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}

// ── Card form fields (pour l'édition uniquement) ───────────────────────────────
function CardFormFields({ form, onChange, categories }: {
  form: CardForm; onChange: (f: CardForm) => void; categories: Category[]
}) {
  function set(patch: Partial<CardForm>) { onChange({ ...form, ...patch }) }
  function toggleBtn(active: boolean, color: { bg: string; text: string; border?: string }) {
    return {
      flex: 1, padding: '8px 0', borderRadius: 9,
      border: `1px solid ${active ? (color.border ?? color.bg) : 'rgba(255,255,255,0.07)'}`,
      background: active ? color.bg : 'transparent',
      color: active ? color.text : 'rgba(255,255,255,0.2)',
      fontSize: 9, ...MONO, fontWeight: 700 as const, letterSpacing: '0.06em', cursor: 'pointer' as const,
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>BIN (6 chiffres)</div>
          <input style={INPUT_STYLE} value={form.bin} onChange={e => {
            const bin = e.target.value.replace(/\D/g, '').slice(0, 6)
            const b0 = bin[0]
            const network: CardNetwork = b0 === '4' ? 'VISA' : b0 === '5' ? 'MASTERCARD' : b0 === '3' ? 'AMEX' : form.network
            set({ bin, network })
          }} placeholder="456789" inputMode="numeric" maxLength={6} />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Banque</div>
          <input style={INPUT_STYLE} value={form.bank} onChange={e => set({ bank: e.target.value })} placeholder="BNP Paribas" />
        </div>
      </div>
      {form.bin.length >= 6 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(251,191,36,0.04)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.1)' }}>
          <img src={`https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png`} alt="" style={{ width: 52, height: 33, objectFit: 'cover', borderRadius: 5 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.5)', ...MONO }}>IMAGE AUTO · {form.bin.slice(0, 6)}</span>
        </div>
      )}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Niveau</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {LEVELS.map(lvl => <button key={lvl} onClick={() => set({ level: lvl })} style={toggleBtn(form.level === lvl, LEVEL_COLORS[lvl])}>{lvl}</button>)}
        </div>
      </div>
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Réseau</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {NETWORKS.map(net => <button key={net} onClick={() => set({ network: net })} style={toggleBtn(form.network === net, NETWORK_COLORS[net])}>{net}</button>)}
        </div>
      </div>
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Type</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {CARD_TYPES.map(t => <button key={t} onClick={() => set({ cardType: t })} style={toggleBtn(form.cardType === t, TYPE_COLORS[t])}>{t}</button>)}
        </div>
      </div>
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Appareil</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DEVICES.map(d => <button key={d} onClick={() => set({ device: d })} style={toggleBtn(form.device === d, DEVICE_COLORS[d])}>{d}</button>)}
        </div>
      </div>
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Source</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SOURCES.map(s => <button key={s} onClick={() => set({ source: s })} style={toggleBtn(form.source === s, SOURCE_COLORS[s])}>{s.replace('_', ' ')}</button>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>DDN (pré-vente)</div>
          <input style={INPUT_STYLE} value={form.ddn} onChange={e => set({ ddn: e.target.value })} placeholder="JJ/MM/AAAA" />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Date récupération</div>
          <input style={{ ...INPUT_STYLE, colorScheme: 'dark' } as React.CSSProperties} type="date" value={form.recoveryDate} onChange={e => set({ recoveryDate: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Mon prix (€)</div>
          <input style={INPUT_STYLE} type="number" value={form.prix} onChange={e => set({ prix: e.target.value })} placeholder="15" inputMode="decimal" />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', ...MONO, marginTop: 4 }}>Tu reçois ce montant à chaque vente.</div>
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Stock</div>
          <input style={INPUT_STYLE} type="number" value={form.stock} onChange={e => set({ stock: e.target.value })} placeholder="1" inputMode="numeric" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Code Postal</div>
          <input style={INPUT_STYLE} value={form.cp} onChange={e => set({ cp: e.target.value })} placeholder="75001" />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Âge titulaire</div>
          <input style={INPUT_STYLE} value={form.age} onChange={e => set({ age: e.target.value })} placeholder="35" inputMode="numeric" />
        </div>
      </div>
      {categories.length > 0 && (
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Catégorie</div>
          <select style={{ ...INPUT_STYLE, appearance: 'none' as any }} value={form.categoryId} onChange={e => set({ categoryId: Number(e.target.value) })}>
            <option value={0}>— Aucune —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Edit page ─────────────────────────────────────────────────────────────────
function EditPage({ productId }: { productId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CardForm>(emptyCardForm())
  const [error, setError] = useState<string | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  const { data: existingProduct } = useQuery<CollabProduct>({
    queryKey: ['collab-product', productId],
    queryFn: () => api.get('/api/collab/products').then(r => {
      const products: CollabProduct[] = r.data
      const found = products.find(p => p.id === productId)
      if (!found) throw new Error('Not found')
      return found
    }),
  })

  useEffect(() => {
    if (existingProduct) {
      const meta = parseCardMeta(existingProduct.description)
      setForm({
        bin: meta.bin, bank: meta.bank, level: meta.level, network: meta.network,
        cardType: meta.type, device: meta.device, source: meta.source,
        ddn: meta.ddn, recoveryDate: meta.recoveryDate,
        prix: String(existingProduct.costEur ?? existingProduct.price), stock: String(existingProduct.stock),
        cp: meta.cp, age: meta.age, categoryId: existingProduct.categoryId ?? 0,
      })
    }
  }, [existingProduct])

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.put(`/api/collab/products/${productId}`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      navigate('/collab')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Erreur lors de la sauvegarde.')
    },
  })

  function handleSubmit() {
    if (!form.bank || !form.prix) { setError('Banque et prix sont requis.'); return }
    setError(null)
    saveMutation.mutate(buildProductPayload(form))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/collab')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MODIFIER LA CARTE</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px' }}>
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
          <div style={{ ...LABEL_STYLE, color: GOLD, marginBottom: 16 }}>· MODIFIER LES INFORMATIONS</div>
          <CardFormFields form={form} onChange={setForm} categories={categories} />
          {error && (
            <div style={{ marginTop: 12, fontSize: 12, ...MONO, color: DANGER, padding: '8px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={handleSubmit} disabled={saveMutation.isPending} style={{ flex: 1, padding: '13px 0', borderRadius: 10, background: saveMutation.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: saveMutation.isPending ? 'not-allowed' : 'pointer' }}>
              {saveMutation.isPending ? '...' : 'SAUVEGARDER'}
            </button>
            <button onClick={() => navigate('/collab')} style={{ padding: '13px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', ...BEBAS, fontSize: 15, letterSpacing: '0.06em', cursor: 'pointer' }}>
              ANNULER
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #1a1a1a; color: #fff; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ── Root export ────────────────────────────────────────────────────────────────
export default function CollabAddCard() {
  const { id } = useParams<{ id: string }>()
  const productId = id ? parseInt(id) : null

  if (productId) return <EditPage productId={productId} />
  return <AddNewPage />
}
