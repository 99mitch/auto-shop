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

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  VISA:          { bg: 'rgba(99,102,241,0.18)',  color: '#818cf8' },
  MASTERCARD:    { bg: 'rgba(249,115,22,0.18)',  color: '#fb923c' },
  DEBIT:         { bg: 'rgba(234,179,8,0.18)',   color: '#facc15' },
  CREDIT:        { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  AMELI:         { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  ANDROID:       { bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee' },
  IPHONE:        { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
  "AUJOURD'HUI": { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  'J-1':         { bg: 'rgba(251,191,36,0.08)',  color: 'rgba(251,191,36,0.55)' },
  'J-2':         { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
}

const NIVEAU_ACCENT: Record<string, string> = {
  GOLD:    '#fbbf24',
  PREMIER: '#a78bfa',
  CLASSIC: 'rgba(255,255,255,0.2)',
}

const MOCK_CARDS: MockCard[] = [
  { id: 1,  bin: '497203', name: 'Crédit Mutuel Visa Classic',    price: 18, stock: 8,  imageUrl: '', images: [], description: 'Crédit Mutuel — Visa Classic. Balance vérifiée, CVV inclus.',  categoryId: 1, isActive: true, niveau: 'CLASSIC', age: 34, cp: '75012', tags: ['VISA','DEBIT',"AUJOURD'HUI"],                  banque: 'CRÉDIT MUTUEL',    category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 2,  bin: '497207', name: 'Crédit Mutuel Visa Gold',       price: 30, stock: 3,  imageUrl: '', images: [], description: 'Crédit Mutuel — Visa Gold. Plafond élevé. CVV + date inclus.', categoryId: 1, isActive: true, niveau: 'GOLD',    age: 48, cp: '69001', tags: ['VISA','CREDIT','AMELI','ANDROID','J-1'],        banque: 'CRÉDIT MUTUEL',    category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 3,  bin: '497208', name: 'CIC Visa Premier',              price: 45, stock: 5,  imageUrl: '', images: [], description: 'CIC — Visa Premier. Fullz disponible sur demande.',            categoryId: 1, isActive: true, niveau: 'PREMIER', age: 52, cp: '33000', tags: ['VISA','CREDIT','AMELI','IPHONE',"AUJOURD'HUI"],  banque: 'CIC',              category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 4,  bin: '497490', name: 'Crédit Agricole Visa Classic',  price: 15, stock: 12, imageUrl: '', images: [], description: 'Crédit Agricole — Visa Classic. Testé & valide.',             categoryId: 1, isActive: true, niveau: 'CLASSIC', age: 27, cp: '13001', tags: ['VISA','DEBIT','ANDROID',"AUJOURD'HUI"],          banque: 'CRÉDIT AGRICOLE',  category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 5,  bin: '497492', name: 'Crédit Agricole Visa Premier',  price: 38, stock: 2,  imageUrl: '', images: [], description: 'Crédit Agricole — Visa Premier. Stock limité.',               categoryId: 1, isActive: true, niveau: 'PREMIER', age: 61, cp: '59000', tags: ['VISA','CREDIT','AMELI','IPHONE','J-1'],          banque: 'CRÉDIT AGRICOLE',  category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 6,  bin: '497410', name: 'LCL Visa Classic',              price: 20, stock: 9,  imageUrl: '', images: [], description: 'LCL — Visa Classic. Livraison en moins de 24h.',              categoryId: 1, isActive: true, niveau: 'CLASSIC', age: 38, cp: '44000', tags: ['VISA','DEBIT',"AUJOURD'HUI"],                  banque: 'LCL',              category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 7,  bin: '497413', name: 'LCL Visa Premier',              price: 42, stock: 6,  imageUrl: '', images: [], description: 'LCL — Visa Premier. Haut plafond. CVV + expiry fournis.',     categoryId: 1, isActive: true, niveau: 'PREMIER', age: 47, cp: '31000', tags: ['VISA','CREDIT','AMELI','ANDROID',"AUJOURD'HUI"], banque: 'LCL',              category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 8,  bin: '497974', name: 'BNP Paribas Visa Premier',      price: 55, stock: 4,  imageUrl: '', images: [], description: 'BNP Paribas — Visa Premier. Compte vérifié, solde garanti.',  categoryId: 1, isActive: true, niveau: 'PREMIER', age: 55, cp: '75008', tags: ['VISA','CREDIT','AMELI','IPHONE','J-1'],          banque: 'BNP PARIBAS',      category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 9,  bin: '498208', name: 'Société Générale Visa Premier', price: 48, stock: 7,  imageUrl: '', images: [], description: 'Société Générale — Visa Premier. Fullz dispo.',               categoryId: 1, isActive: true, niveau: 'PREMIER', age: 43, cp: '92100', tags: ['VISA','CREDIT','ANDROID',"AUJOURD'HUI"],        banque: 'SOCIÉTÉ GÉNÉRALE', category: { id:1, name:'Visa',       slug:'visa', order:1 } },
  { id: 10, bin: '534543', name: 'BNP Paribas Mastercard Gold',   price: 50, stock: 3,  imageUrl: '', images: [], description: 'BNP Paribas — Mastercard Gold. Solde élevé.',                 categoryId: 2, isActive: true, niveau: 'GOLD',    age: 39, cp: '06000', tags: ['MASTERCARD','CREDIT','AMELI','IPHONE','J-1'],    banque: 'BNP PARIBAS',      category: { id:2, name:'Mastercard', slug:'mc',   order:2 } },
  { id: 11, bin: '529941', name: 'Société Générale Mastercard',   price: 35, stock: 8,  imageUrl: '', images: [], description: 'SG — Mastercard Standard. Balance testée.',                   categoryId: 2, isActive: true, niveau: 'CLASSIC', age: 24, cp: '67000', tags: ['MASTERCARD','DEBIT','ANDROID',"AUJOURD'HUI"],    banque: 'SOCIÉTÉ GÉNÉRALE', category: { id:2, name:'Mastercard', slug:'mc',   order:2 } },
  { id: 12, bin: '497110', name: 'La Banque Postale Visa',        price: 12, stock: 0,  imageUrl: '', images: [], description: 'La Banque Postale — Visa Classic. Réappro sous 48h.',         categoryId: 1, isActive: true, niveau: 'CLASSIC', age: 23, cp: '16000', tags: ['VISA','DEBIT',"AUJOURD'HUI"],                  banque: 'LA BANQUE POSTALE',category: { id:1, name:'Visa',       slug:'visa', order:1 } },
]

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [showSheet, setShowSheet] = useState(false)
  const [imgError, setImgError] = useState(false)

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
    '#b45309',
    '#fef3c7',
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

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
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

      {/* Card preview */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          width: '100%', aspectRatio: '1.586',
          borderRadius: 18, overflow: 'hidden',
          border: '1px solid rgba(251,191,36,0.25)',
          position: 'relative', background: '#111',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Real card image */}
          {mockCard && !imgError ? (
            <img
              src={`https://cardimages.imaginecurve.com/cards/${mockCard.bin}.png`}
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
          {mockCard && !imgError && (
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
      <div style={{ padding: '16px 16px' }}>

        {/* BIN + tags */}
        {mockCard && (
          <div style={{
            background: '#111',
            border: `1px solid rgba(255,255,255,0.07)`,
            borderLeft: `3px solid ${NIVEAU_ACCENT[mockCard.niveau] ?? 'rgba(255,255,255,0.2)'}`,
            borderRadius: 14, marginBottom: 12, overflow: 'hidden',
          }}>
            {/* BIN row */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>BIN</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', lineHeight: 1 }}>
                {mockCard.bin}
              </div>
            </div>

            {/* Tags */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {mockCard.tags.map((t: string) => {
                const c = TAG_COLORS[t] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
                return (
                  <span key={t} style={{
                    background: c.bg, color: c.color,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    padding: '3px 8px', borderRadius: 5,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>{t}</span>
                )
              })}
            </div>

            {/* Data grid 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { label: 'AGE',         value: `${mockCard.age} ans` },
                { label: 'BANQUE',      value: mockCard.banque },
                { label: 'NIVEAU',      value: mockCard.niveau },
                { label: 'CODE POSTAL', value: mockCard.cp },
              ].map((f, i) => (
                <div key={f.label} style={{
                  padding: '12px 16px',
                  borderRight:  i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  borderBottom: i < 2       ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 4 }}>{f.label}</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: f.label === 'NIVEAU' ? (NIVEAU_ACCENT[mockCard.niveau] ?? '#fff') : 'rgba(255,255,255,0.88)',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Prix */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 26, color: NIVEAU_ACCENT[mockCard.niveau] ?? '#fbbf24', letterSpacing: '0.04em' }}>
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

      {showSheet && (
        <AddedToCartSheet
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          onClose={() => setShowSheet(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  )
}
