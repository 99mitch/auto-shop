import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

import type { MockCard } from './Catalogue'
import { MOCK_CARDS } from './Catalogue'

type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'
type CardType = 'DEBIT' | 'CREDIT'
type CardDevice = 'IPHONE' | 'ANDROID' | 'UNKNOWN'
type CardSource = 'AMELI' | 'MONDIAL_RELAY' | 'AMAZON' | 'OTHER'

interface CardMeta {
  bin: string; bank: string; network: CardNetwork; level: 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'
  type: CardType; device: CardDevice; source: CardSource
  recoveryDate: string; ddn: string; cp: string; age: string
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

const NETWORK_COLORS: Record<CardNetwork, { bg: string; color: string }> = {
  VISA:       { bg: 'rgba(129,140,248,0.18)', color: '#818cf8' },
  MASTERCARD: { bg: 'rgba(251,146,60,0.18)',  color: '#fb923c' },
  AMEX:       { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  OTHER:      { bg: 'rgba(156,163,175,0.1)',  color: 'rgba(156,163,175,0.6)' },
}

const TYPE_COLORS: Record<CardType, { bg: string; color: string }> = {
  DEBIT:  { bg: 'rgba(250,204,21,0.18)',  color: '#facc15' },
  CREDIT: { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
}

const DEVICE_COLORS: Record<CardDevice, { bg: string; color: string }> = {
  IPHONE:  { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
  ANDROID: { bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee' },
  UNKNOWN: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
}

const SOURCE_COLORS: Record<CardSource, { bg: string; color: string }> = {
  AMELI:         { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  MONDIAL_RELAY: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  AMAZON:        { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  OTHER:         { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
}

const NIVEAU_ACCENT: Record<string, string> = {
  GOLD:     '#fbbf24',
  PLATINUM: '#a78bfa',
  BLACK:    '#ffffff',
  CLASSIC:  'rgba(255,255,255,0.2)',
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [showSheet, setShowSheet] = useState(false)
  const [imgError, setImgError] = useState(false)

  // suppress unused warning
  void searchParams

  useTelegramBackButton(() => navigate(-1))

  // Check if this is a mock card (id 1-12)
  const numId = Number(id)
  const mockCard = MOCK_CARDS.find((c) => c.id === numId)

  const { data: apiProduct, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/api/products/${id}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !mockCard,
  })

  const product = mockCard ?? apiProduct

  // Parse metadata from actual product description (primary) or fall back to mock
  const cardMeta = product ? parseCardMeta(product.description) : null

  const displayMeta: CardMeta | null = cardMeta?.bin
    ? cardMeta
    : mockCard
      ? {
          bin: mockCard.bin,
          bank: mockCard.banque,
          network: mockCard.network,
          level: mockCard.niveau as CardMeta['level'],
          type: mockCard.cardType,
          device: mockCard.device,
          source: mockCard.source,
          recoveryDate: mockCard.recoveryDate,
          ddn: mockCard.ddn,
          cp: mockCard.cp,
          age: String(mockCard.age),
        }
      : null

  const displayBin = displayMeta?.bin || mockCard?.bin || ''

  const handleAddToCart = useCallback(() => {
    if (!product) return
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
      options: {},
    })
    WebApp.HapticFeedback?.notificationOccurred('success')
    setShowSheet(true)
  }, [product, addItem])

  useTelegramMainButton(
    product ? `Ajouter au panier — €${product.price.toFixed(2)}` : 'Chargement...',
    handleAddToCart,
    !!product && product.stock > 0 && !showSheet,
    '#1a1500',
    '#fbbf24',
  )

  if (isLoading) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', padding: 16 }}>
        <div style={{ height: 44, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }} />
        <div style={{ height: 200, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
        <div style={{ height: 24, width: '60%', marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
        <div style={{ height: 16, marginBottom: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
        <div style={{ height: 16, width: '75%', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>▣</div>
        <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>INTROUVABLE</p>
      </div>
    )
  }

  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 5
  const niveauAccent = NIVEAU_ACCENT[displayMeta?.level ?? 'CLASSIC'] ?? 'rgba(255,255,255,0.2)'

  return (
    <div style={{ background: '#050505', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: '1px solid rgba(251,191,36,0.2)',
            background: 'rgba(251,191,36,0.08)',
            color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
          aria-label="Retour"
        >←</button>
        <div style={{
          flex: 1, overflow: 'hidden',
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          fontSize: 16, letterSpacing: '0.08em', color: '#fff',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {product.name}
        </div>
        <CartIcon dark />
      </div>

      {/* Scrollless content area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 16px 16px', gap: 10, overflow: 'hidden' }}>

        {/* Card preview */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 'min(100%, calc(38vh * 1.586))',
            aspectRatio: '1.586',
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(251,191,36,0.25)',
            position: 'relative', background: '#111',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {/* Real card image */}
            {displayBin && !imgError ? (
              <img
                src={`https://cardimages.imaginecurve.com/cards/${displayBin}.png`}
                alt={product.name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              /* CSS fallback */
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(145deg, #1c1c1e 0%, #111 55%, #0d0d0d 100%)',
                padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: 36, height: 28, borderRadius: 4, background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #a07010 100%)' }} />
                  <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: 'rgba(251,191,36,0.8)' }}>{product.category?.name ?? 'FULLZ'}</span>
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 12 }}>
                  <span>••••</span><span>••••</span><span>••••</span><span style={{ color: 'rgba(255,255,255,0.9)' }}>{String(product.id).padStart(4,'0').slice(-4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.15em', marginBottom: 3 }}>CARDHOLDER</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>{product.name}</div>
                  </div>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 28, color: '#fbbf24' }}>€{product.price.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Price badge over real image */}
            {displayBin && !imgError && (
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: 8, padding: '4px 10px',
                fontFamily: '"Bebas Neue", "Impact", sans-serif',
                fontSize: 20, color: '#fbbf24', letterSpacing: '0.04em',
              }}>
                €{product.price.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* BIN + meta */}
          {displayMeta && (
            <div style={{
              background: '#111',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderLeft: `3px solid ${niveauAccent}`,
              borderRadius: 14, marginBottom: 12, overflow: 'hidden',
            }}>
              {/* BIN row */}
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>BIN</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', lineHeight: 1 }}>
                  {displayMeta.bin || '——————'}
                </div>
              </div>

              {/* DDN row — prominent, pre-sale key field */}
              {displayMeta.ddn && (
                <div style={{ padding: '6px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.35)' }}>DDN </span>
                  <span style={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: '0.06em' }}>{displayMeta.ddn}</span>
                </div>
              )}

              {/* Badges row */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {displayMeta.network !== 'OTHER' && (
                  <span style={{ background: NETWORK_COLORS[displayMeta.network].bg, color: NETWORK_COLORS[displayMeta.network].color, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace' }}>{displayMeta.network}</span>
                )}
                <span style={{ background: TYPE_COLORS[displayMeta.type].bg, color: TYPE_COLORS[displayMeta.type].color, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace' }}>{displayMeta.type}</span>
                {displayMeta.device !== 'UNKNOWN' && (
                  <span style={{ background: DEVICE_COLORS[displayMeta.device].bg, color: DEVICE_COLORS[displayMeta.device].color, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace' }}>{displayMeta.device}</span>
                )}
                {displayMeta.source !== 'OTHER' && (
                  <span style={{ background: SOURCE_COLORS[displayMeta.source].bg, color: SOURCE_COLORS[displayMeta.source].color, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace' }}>{displayMeta.source.replace('_', ' ')}</span>
                )}
              </div>

              {/* Data grid 2×3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { label: 'AGE',         value: displayMeta.age ? `${displayMeta.age} ans` : '—' },
                  { label: 'DDN',         value: displayMeta.ddn || '—', highlight: true },
                  { label: 'BANQUE',      value: displayMeta.bank || '—' },
                  { label: 'RÉSEAU',      value: displayMeta.network, isNetwork: true },
                  { label: 'NIVEAU',      value: displayMeta.level },
                  { label: 'CODE POSTAL', value: displayMeta.cp || '—' },
                ].map((f, i) => (
                  <div key={f.label} style={{
                    padding: '8px 14px',
                    borderRight:  i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom: i < 4       ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 4 }}>{f.label}</div>
                    <div style={{
                      fontSize: f.highlight ? 14 : 13, fontWeight: 700,
                      color: f.highlight
                        ? 'rgba(255,255,255,0.9)'
                        : f.label === 'NIVEAU'
                          ? (niveauAccent)
                          : f.isNetwork
                            ? (NETWORK_COLORS[displayMeta.network]?.color ?? 'rgba(255,255,255,0.88)')
                            : 'rgba(255,255,255,0.88)',
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Second info row: TYPE / APPAREIL / SOURCE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'TYPE',     value: displayMeta.type,   color: TYPE_COLORS[displayMeta.type].color },
                  { label: 'APPAREIL', value: displayMeta.device, color: DEVICE_COLORS[displayMeta.device].color },
                  { label: 'SOURCE',   value: displayMeta.source.replace('_', ' '), color: SOURCE_COLORS[displayMeta.source].color },
                ].map((f, i) => (
                  <div key={f.label} style={{
                    padding: '7px 10px',
                    borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: f.color, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em' }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Prix */}
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 26, color: niveauAccent, letterSpacing: '0.04em' }}>
                  €{product.price.toFixed(2)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isLow && <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: '#f59e0b', letterSpacing: '0.1em' }}>⚠ {product.stock} restants</span>}
                  {isOut  && <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: '#ef4444', letterSpacing: '0.1em' }}>ÉPUISÉ</span>}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>{/* end scrollless content area */}

      {showSheet && (
        <AddedToCartSheet
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          bin={displayBin || mockCard?.bin}
          niveau={displayMeta?.level ?? mockCard?.niveau}
          onClose={() => setShowSheet(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  )
}
