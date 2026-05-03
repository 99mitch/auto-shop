import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product, Category } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import ProductCard from '../components/ProductCard'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const ALL = ''
const CARD_IMG = (bin: string) => `https://cardimages.imaginecurve.com/cards/${bin}.png`

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

export type CardExtras = {
  bin: string; niveau: string; age: number; cp: string; tags: string[]; banque: string
  categoryId?: number; isActive?: boolean
  network: CardNetwork; cardType: CardType; device: CardDevice; source: CardSource
  ddn: string; recoveryDate: string
}
export type MockCard = Omit<Product, 'categoryId' | 'isActive'> & CardExtras

const mc = (
  id: number, bin: string, name: string, price: number, stock: number,
  catId: number, catName: string, catSlug: string, desc: string,
  niveau: string, age: number, cp: string, tags: string[], banque: string,
  network: CardNetwork, cardType: CardType, device: CardDevice, source: CardSource,
  ddn: string, recoveryDate: string,
): MockCard => ({
  id, bin, name, price, stock, imageUrl: CARD_IMG(bin), images: [], description: desc,
  categoryId: catId, isActive: true, niveau, age, cp, tags, banque,
  network, cardType, device, source, ddn, recoveryDate,
  category: { id: catId, name: catName, slug: catSlug, order: catId },
})

export const MOCK_CARDS: MockCard[] = [
  mc(1,  '497203', 'Crédit Mutuel Visa Classic',    18, 8,  1, 'Visa', 'visa', 'Crédit Mutuel — Visa Classic. Balance vérifiée, CVV inclus.',  'CLASSIC', 34, '75012', ['VISA','DEBIT',"AUJOURD'HUI"],                  'CRÉDIT MUTUEL',    'VISA',       'DEBIT',  'ANDROID', 'AMELI',  '12/08/1990', '2025-04-15'),
  mc(2,  '497207', 'Crédit Mutuel Visa Gold',       30, 3,  1, 'Visa', 'visa', 'Crédit Mutuel — Visa Gold. Plafond élevé. CVV + date inclus.', 'GOLD',    48, '69001', ['VISA','CREDIT','AMELI','ANDROID','J-1'],        'CRÉDIT MUTUEL',    'VISA',       'CREDIT', 'ANDROID', 'AMELI',  '03/11/1976', '2025-04-18'),
  mc(3,  '497208', 'CIC Visa Premier',              45, 5,  1, 'Visa', 'visa', 'CIC — Visa Premier. Fullz disponible sur demande.',            'PLATINUM', 52, '33000', ['VISA','CREDIT','AMELI','IPHONE',"AUJOURD'HUI"], 'CIC',              'VISA',       'CREDIT', 'IPHONE',  'AMELI',  '17/05/1972', '2025-04-20'),
  mc(4,  '497490', 'Crédit Agricole Visa Classic',  15, 12, 1, 'Visa', 'visa', 'Crédit Agricole — Visa Classic. Testé & valide.',             'CLASSIC', 27, '13001', ['VISA','DEBIT','ANDROID',"AUJOURD'HUI"],          'CRÉDIT AGRICOLE',  'VISA',       'DEBIT',  'ANDROID', 'OTHER', '22/02/1997', '2025-04-22'),
  mc(5,  '497492', 'Crédit Agricole Visa Premier',  38, 2,  1, 'Visa', 'visa', 'Crédit Agricole — Visa Premier. Stock limité.',               'PLATINUM', 61, '59000', ['VISA','CREDIT','AMELI','IPHONE','J-1'],         'CRÉDIT AGRICOLE',  'VISA',       'CREDIT', 'IPHONE',  'AMELI',  '09/12/1963', '2025-04-25'),
  mc(6,  '497410', 'LCL Visa Classic',              20, 9,  1, 'Visa', 'visa', 'LCL — Visa Classic. Livraison en moins de 24h.',              'CLASSIC', 38, '44000', ['VISA','DEBIT',"AUJOURD'HUI"],                    'LCL',              'VISA',       'DEBIT',  'UNKNOWN', 'OTHER', '30/06/1986', '2025-04-28'),
  mc(7,  '497413', 'LCL Visa Premier',              42, 6,  1, 'Visa', 'visa', 'LCL — Visa Premier. Haut plafond. CVV + expiry fournis.',     'PLATINUM', 47, '31000', ['VISA','CREDIT','AMELI','ANDROID',"AUJOURD'HUI"], 'LCL',             'VISA',       'CREDIT', 'ANDROID', 'AMELI',  '14/03/1978', '2025-04-29'),
  mc(8,  '497974', 'BNP Paribas Visa Premier',      55, 4,  1, 'Visa', 'visa', 'BNP Paribas — Visa Premier. Compte vérifié, solde garanti.',  'PLATINUM', 55, '75008', ['VISA','CREDIT','AMELI','IPHONE','J-1'],         'BNP PARIBAS',      'VISA',       'CREDIT', 'IPHONE',  'AMELI',  '25/09/1969', '2025-05-01'),
  mc(9,  '498208', 'Société Générale Visa Premier', 48, 7,  1, 'Visa', 'visa', 'Société Générale — Visa Premier. Fullz dispo.',               'PLATINUM', 43, '92100', ['VISA','CREDIT','ANDROID',"AUJOURD'HUI"],         'SOCIÉTÉ GÉNÉRALE', 'VISA',       'CREDIT', 'ANDROID', 'AMAZON', '07/04/1981', '2025-05-02'),
  mc(10, '534543', 'BNP Paribas Mastercard Gold',   50, 3,  2, 'Mastercard', 'mc', 'BNP Paribas — Mastercard Gold. Solde élevé.',            'GOLD',    39, '06000', ['MASTERCARD','CREDIT','AMELI','IPHONE','J-1'],    'BNP PARIBAS',      'MASTERCARD', 'CREDIT', 'IPHONE',  'AMELI',  '18/07/1985', '2025-04-30'),
  mc(11, '529941', 'Société Générale Mastercard',   35, 8,  2, 'Mastercard', 'mc', 'SG — Mastercard Standard. Balance testée.',              'CLASSIC', 24, '67000', ['MASTERCARD','DEBIT','ANDROID',"AUJOURD'HUI"],    'SOCIÉTÉ GÉNÉRALE', 'MASTERCARD', 'DEBIT',  'ANDROID', 'OTHER', '05/01/2001', '2025-04-27'),
  mc(12, '497110', 'La Banque Postale Visa',        12, 0,  1, 'Visa', 'visa', 'La Banque Postale — Visa Classic. Réapprovisionnement 48h.', 'CLASSIC', 23, '16000', ['VISA','DEBIT',"AUJOURD'HUI"],                    'LA BANQUE POSTALE','VISA',       'DEBIT',  'UNKNOWN', 'OTHER', '11/11/2002', '2025-04-10'),
]

const BANQUES = ['CRÉDIT MUTUEL', 'CIC', 'CRÉDIT AGRICOLE', 'LCL', 'BNP PARIBAS', 'SOCIÉTÉ GÉNÉRALE', 'LA BANQUE POSTALE']
const AGE_BRACKETS = [
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-45', min: 36, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '60+',   min: 60, max: 99 },
]

interface Filters {
  origine: string
  niveau: string
  banque: string
  telephone: string
  ageBracket: string
}

const DEFAULT_FILTERS: Filters = { origine: ALL, niveau: ALL, banque: ALL, telephone: ALL, ageBracket: ALL }

function countActiveFilters(f: Filters) {
  return [f.origine, f.niveau, f.banque, f.telephone, f.ageBracket].filter(Boolean).length
}

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? 'cards'
  const addItem = useCartStore((s) => s.addItem)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addedProduct, setAddedProduct] = useState<MockCard | null>(null)

  useTelegramBackButton(() => navigate('/'))

  const isCards = type === 'cards'
  const accent = isCards
    ? { main: '#fbbf24', dim: 'rgba(251,191,36,0.6)', faint: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' }
    : { main: '#22d3ee', dim: 'rgba(34,211,238,0.6)',  faint: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.2)'  }
  const label = isCards ? 'VENTE DE CARTES' : 'DONNÉES DIGITALES'

  const { data: apiCategories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !isCards,
  })
  const { data: apiProducts = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      return api.get(`/api/products?${params}`).then((r) => r.data)
    },
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = catLoading || prodLoading

  const allProducts: MockCard[] = isCards
    ? (apiProducts.length > 0
        ? apiProducts.map(p => {
            const m = parseCardMeta(p.description)
            return {
              ...p,
              bin: m.bin,
              banque: m.bank,
              niveau: m.level,
              age: parseInt(m.age) || 0,
              cp: m.cp,
              tags: [],
              network: m.network,
              cardType: m.type,
              device: m.device,
              source: m.source,
              ddn: m.ddn,
              recoveryDate: m.recoveryDate,
            } as MockCard
          })
        : MOCK_CARDS)
    : (apiProducts as any[])

  const products = allProducts.filter((p) => {
    const q = search.toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !p.bin?.includes(q)) return false
    if (filters.origine && p.category?.slug !== filters.origine) return false
    if (filters.niveau && p.niveau !== filters.niveau) return false
    if (filters.banque && p.banque !== filters.banque) return false
    if (filters.telephone) {
      // support both new device field and legacy tags
      const matchesDevice = (p as MockCard).device === filters.telephone
      const matchesTags = p.tags?.includes(filters.telephone)
      if (!matchesDevice && !matchesTags) return false
    }
    if (filters.ageBracket) {
      const bracket = AGE_BRACKETS.find((b) => b.label === filters.ageBracket)
      if (bracket && (p.age < bracket.min || p.age > bracket.max)) return false
    }
    return true
  })

  const activeCount = countActiveFilters(filters)

  const openSheet = () => { setPending(filters); setSheetOpen(true) }
  const applyFilters = () => { setFilters(pending); setSheetOpen(false) }
  const clearFilters = () => { setPending(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setSheetOpen(false) }
  const removeFilter = (key: keyof Filters) => setFilters((f) => ({ ...f, [key]: ALL }))

  const handleQuickAdd = useCallback((product: MockCard) => {
    addItem({ productId: product.id, productName: product.name, productImageUrl: product.imageUrl, unitPrice: product.price, options: {} })
    WebApp.HapticFeedback?.notificationOccurred('success')
    setAddedProduct(product)
  }, [addItem])

  const categories = isCards
    ? [{ id: 1, slug: 'visa', name: 'Visa', order: 1 }, { id: 2, slug: 'mc', name: 'Mastercard', order: 2 }]
    : apiCategories

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${accent.border}`,
        padding: '10px 14px',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={() => navigate('/')} style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            border: `1px solid ${accent.border}`, background: accent.faint,
            color: accent.main, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>←</button>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 16, letterSpacing: '0.08em', color: '#fff' }}>{label}</span>
            {!isLoading && <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: accent.dim, marginLeft: 8, letterSpacing: '0.1em' }}>{products.length} résultat{products.length !== 1 ? 's' : ''}</span>}
          </div>
          <CartIcon dark />
        </div>

        {/* Search + filter row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 9, padding: '7px 10px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, flexShrink: 0 }}>⌕</span>
            <input
              type="text" placeholder="BIN, banque..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: '#fff', fontFamily: '"JetBrains Mono", monospace', caretColor: accent.main }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>}
          </div>

          {/* Filter button */}
          <button onClick={openSheet} style={{
            flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 9, cursor: 'pointer',
            background: activeCount > 0 ? accent.faint : 'rgba(255,255,255,0.04)',
            border: `1px solid ${activeCount > 0 ? accent.main : 'rgba(255,255,255,0.08)'}`,
            color: activeCount > 0 ? accent.main : 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
          }}>
            <span style={{ fontSize: 12 }}>⊟</span>
            FILTRES
            {activeCount > 0 && (
              <span style={{
                background: accent.main, color: '#000',
                fontSize: 9, fontWeight: 700, borderRadius: 4,
                padding: '1px 4px', lineHeight: 1,
              }}>{activeCount}</span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
            {(Object.entries(filters) as [keyof Filters, string][]).filter(([, v]) => v).map(([key, val]) => (
              <button key={key} onClick={() => removeFilter(key)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
                fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
                fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em',
              }}>
                {val.toUpperCase()} <span style={{ opacity: 0.5 }}>×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card list */}
      <div style={{ padding: '12px 14px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 130, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent.border}`, animation: 'shimmer 1.5s ease-in-out infinite' }} />
          ))
        ) : products.length === 0 ? (
          <div style={{ paddingTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 32, opacity: 0.2 }}>▣</div>
            <p style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>AUCUN RÉSULTAT</p>
            {activeCount > 0 && (
              <button onClick={clearFilters} style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: accent.dim, background: 'none', border: `1px solid ${accent.border}`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                EFFACER FILTRES
              </button>
            )}
          </div>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id} product={product as unknown as Product} dark
              bin={product.bin} niveau={product.niveau} age={product.age}
              cp={product.cp} tags={product.tags} banque={product.banque}
              onClick={() => navigate(`/product/${product.id}`)}
              onQuickAdd={() => handleQuickAdd(product as MockCard)}
            />
          ))
        )}
      </div>

      {/* Filter sheet */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.65)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: '#0d0d0d', borderRadius: '18px 18px 0 0',
            border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
            padding: '6px 0 32px',
            maxHeight: '82vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 14px' }} />

            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              <FilterGroup label="ORIGINE" accent={accent.main}>
                {[{ label: 'TOUS', value: ALL }, ...categories.map((c) => ({ label: c.name.toUpperCase(), value: c.slug }))].map((o) => (
                  <Pill key={o.value} label={o.label} active={pending.origine === o.value} accent={accent.main} onClick={() => setPending((p) => ({ ...p, origine: o.value }))} />
                ))}
              </FilterGroup>

              <FilterGroup label="NIVEAU" accent={accent.main}>
                {[ALL, 'CLASSIC', 'PLATINUM', 'GOLD', 'BLACK'].map((v) => (
                  <Pill key={v} label={v || 'TOUS'} active={pending.niveau === v} accent={v === 'GOLD' ? '#fbbf24' : v === 'PLATINUM' ? '#a78bfa' : accent.main} onClick={() => setPending((p) => ({ ...p, niveau: v }))} />
                ))}
              </FilterGroup>

              <FilterGroup label="BANQUE" accent={accent.main}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <Pill label="TOUTES" active={pending.banque === ALL} accent={accent.main} onClick={() => setPending((p) => ({ ...p, banque: ALL }))} />
                  {BANQUES.map((b) => (
                    <Pill key={b} label={b} active={pending.banque === b} accent={accent.main} onClick={() => setPending((p) => ({ ...p, banque: b }))} />
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup label="TÉLÉPHONE" accent={accent.main}>
                {[
                  { label: 'TOUS',    value: ALL },
                  { label: 'IPHONE',  value: 'IPHONE' },
                  { label: 'ANDROID', value: 'ANDROID' },
                  { label: 'UNKNOWN', value: 'UNKNOWN' },
                ].map((o) => (
                  <Pill key={o.value} label={o.label} active={pending.telephone === o.value} accent={o.value === 'IPHONE' ? '#9ca3af' : o.value === 'ANDROID' ? '#22d3ee' : accent.main} onClick={() => setPending((p) => ({ ...p, telephone: o.value }))} />
                ))}
              </FilterGroup>

              <FilterGroup label="TRANCHE D'ÂGE" accent={accent.main}>
                <Pill label="TOUS" active={pending.ageBracket === ALL} accent={accent.main} onClick={() => setPending((p) => ({ ...p, ageBracket: ALL }))} />
                {AGE_BRACKETS.map((b) => (
                  <Pill key={b.label} label={b.label} active={pending.ageBracket === b.label} accent={accent.main} onClick={() => setPending((p) => ({ ...p, ageBracket: b.label }))} />
                ))}
              </FilterGroup>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={clearFilters} style={{
                  flex: 1, height: 42, borderRadius: 11, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
                }}>EFFACER</button>
                <button onClick={applyFilters} style={{
                  flex: 2, height: 42, borderRadius: 11, cursor: 'pointer',
                  background: accent.faint, border: `1px solid ${accent.main}`,
                  color: accent.main, fontSize: 11, fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
                }}>APPLIQUER</button>
              </div>
            </div>
          </div>
        </>
      )}

      {addedProduct && (
        <AddedToCartSheet
          productId={addedProduct.id} productName={addedProduct.name} productPrice={addedProduct.price}
          bin={addedProduct.bin} niveau={addedProduct.niveau}
          onClose={() => setAddedProduct(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        input::placeholder { color: rgba(255,255,255,0.18); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

function FilterGroup({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}

function Pill({ label, active, accent, onClick }: { label: string; active: boolean; accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
      fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
      transition: 'all 0.12s',
      background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
      color: active ? accent : 'rgba(255,255,255,0.35)',
    }}>{label}</button>
  )
}
