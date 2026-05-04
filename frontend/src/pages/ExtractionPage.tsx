import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type DataType = 'FICHE' | 'NUMLIST' | 'MAILLIST'
type Gender = 'ALL' | 'M' | 'F'

interface DataFile {
  id: number; name: string; type: DataType; rowCount: number; uploadedAt: string
}
interface Filters {
  fileIds: number[]; dobFrom: string; dobTo: string
  departments: string[]; banks: string[]; gender: Gender
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_FILES: DataFile[] = [
  { id: -1,  name: 'AMELI_FR_2024_Q1',      type: 'FICHE',    rowCount: 148, uploadedAt: '2024-01-15T10:00:00Z' },
  { id: -2,  name: 'AMELI_FR_2024_Q2',      type: 'FICHE',    rowCount: 163, uploadedAt: '2024-04-10T10:00:00Z' },
  { id: -3,  name: 'SFR_NATIONAL_2024',     type: 'FICHE',    rowCount: 112, uploadedAt: '2024-03-20T10:00:00Z' },
  { id: -4,  name: 'AMAZON_FR_2023',        type: 'FICHE',    rowCount: 197, uploadedAt: '2023-11-05T10:00:00Z' },
  { id: -5,  name: 'CPAM_IDF_2024',         type: 'FICHE',    rowCount: 134, uploadedAt: '2024-05-01T10:00:00Z' },
  { id: -6,  name: 'ORANGE_FR_2024',        type: 'FICHE',    rowCount:  98, uploadedAt: '2024-04-22T10:00:00Z' },
  { id: -7,  name: 'CELIO_2023',            type: 'FICHE',    rowCount:  76, uploadedAt: '2023-08-14T10:00:00Z' },
  { id: -8,  name: 'FNAC_FR_2024',          type: 'FICHE',    rowCount: 121, uploadedAt: '2024-04-28T10:00:00Z' },
  { id: -9,  name: 'IDF_2024_BATCH01',      type: 'NUMLIST',  rowCount: 243, uploadedAt: '2024-03-12T10:00:00Z' },
  { id: -10, name: 'SUD_2024_BATCH01',      type: 'NUMLIST',  rowCount: 187, uploadedAt: '2024-03-08T10:00:00Z' },
  { id: -11, name: 'ORANGE_FR_2024',        type: 'NUMLIST',  rowCount: 312, uploadedAt: '2024-04-02T10:00:00Z' },
  { id: -12, name: 'SFR_FR_2024',           type: 'NUMLIST',  rowCount: 276, uploadedAt: '2024-03-28T10:00:00Z' },
  { id: -13, name: 'NORD_2024',             type: 'NUMLIST',  rowCount: 159, uploadedAt: '2024-02-20T10:00:00Z' },
  { id: -14, name: 'FREE_MOBILE_2024',      type: 'NUMLIST',  rowCount: 228, uploadedAt: '2024-04-18T10:00:00Z' },
  { id: -15, name: 'GAMING_FR_2024',        type: 'MAILLIST', rowCount: 175, uploadedAt: '2024-02-28T10:00:00Z' },
  { id: -16, name: 'ECOMMERCE_FR_2024_Q1',  type: 'MAILLIST', rowCount: 234, uploadedAt: '2024-01-30T10:00:00Z' },
  { id: -17, name: 'ECOMMERCE_FR_2024_Q2',  type: 'MAILLIST', rowCount: 198, uploadedAt: '2024-04-25T10:00:00Z' },
  { id: -18, name: 'FORUM_FR_2023',         type: 'MAILLIST', rowCount: 143, uploadedAt: '2023-07-11T10:00:00Z' },
  { id: -19, name: 'STREAMING_FR_2024',     type: 'MAILLIST', rowCount: 267, uploadedAt: '2024-04-30T10:00:00Z' },
  { id: -20, name: 'RETAIL_FR_2024',        type: 'MAILLIST', rowCount: 156, uploadedAt: '2024-03-05T10:00:00Z' },
]

export const BANKS_TRAD = [
  'BNP PARIBAS', 'CREDIT AGRICOLE', 'SOCIETE GENERALE', 'LCL',
  'CIC', 'CREDIT MUTUEL', 'LA BANQUE POSTALE', 'CAISSE EPARGNE',
  'BANQUE POPULAIRE', 'BRED', 'HSBC FRANCE', 'CREDIT DU NORD',
  'PALATINE', 'AXA BANQUE', 'BOURSORAMA', 'HELLO BANK',
  'FORTUNEO', 'ING', 'MONABANQ', 'ORANGE BANK',
  'MA FRENCH BANK', 'FLOA BANK', 'CETELEM', 'COFIDIS',
  'SOFINCO', 'FRANFINANCE',
]

export const BANKS_NEO = [
  'REVOLUT', 'N26', 'NICKEL', 'QONTO',
  'LYDIA', 'SUMERIA', 'SHINE', 'BUNQ',
  'WISE', 'PIXPAY', 'KARD', 'GREEN GOT',
  'ANYTIME', 'VYBE', 'PAYSERA', 'MONESE',
]

export const ALL_BANKS = [...BANKS_TRAD, ...BANKS_NEO]

const _DEPTS = ['01','06','13','17','21','25','29','31','33','34','35','38','42','44','49','54','57','59','62','63','67','69','75','76','77','78','80','83','91','92','93','94','95']

let _s = 9973
function _r(max: number) { _s = (_s * 1664525 + 1013904223) >>> 0; return _s % max }
interface MockRecord { fileId: number; gender: string; year: number; department: string; bank: string }

const MOCK_RECORDS: MockRecord[] = (() => {
  const out: MockRecord[] = []
  for (const f of MOCK_FILES) {
    for (let i = 0; i < Math.min(f.rowCount, 80); i++) {
      out.push({
        fileId: f.id, gender: _r(2) === 0 ? 'M' : 'F',
        year: 1950 + _r(53),
        department: _DEPTS[_r(_DEPTS.length)],
        bank: f.type === 'FICHE' ? ALL_BANKS[_r(ALL_BANKS.length)] : '',
      })
    }
  }
  return out
})()

function calcMockCount(fileIds: number[], f: Omit<Filters,'fileIds'>): number {
  const yFrom = f.dobFrom ? parseInt(f.dobFrom) : null
  const yTo   = f.dobTo   ? parseInt(f.dobTo)   : null
  return MOCK_RECORDS.filter((r) => {
    if (!fileIds.includes(r.fileId)) return false
    if (yFrom !== null && r.year < yFrom) return false
    if (yTo   !== null && r.year > yTo)   return false
    if (f.departments.length > 0 && !f.departments.includes(r.department)) return false
    if (f.banks.length > 0 && !f.banks.includes(r.bank)) return false
    if (f.gender !== 'ALL' && r.gender !== f.gender) return false
    return true
  }).length
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; accent: string; glow: string }> = {
  fiche:    { label: 'FICHE',    accent: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
  numlist:  { label: 'NUMLIST',  accent: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
  maillist: { label: 'MAILLIST', accent: '#f472b6', glow: 'rgba(244,114,182,0.12)' },
}

function fmt(n: number) { return n.toLocaleString('fr-FR') }
function parseTags(raw: string) { return raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) }

// ─── Composants ───────────────────────────────────────────────────────────────

function FileCard({ file, selected, onToggle, accent }: { file: DataFile; selected: boolean; onToggle: () => void; accent: string }) {
  return (
    <button onClick={onToggle} style={{
      background: selected ? `color-mix(in srgb, ${accent} 8%, #111)` : '#111',
      border: selected ? `1px solid ${accent}60` : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
      textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: selected ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.2)',
          background: selected ? `color-mix(in srgb, ${accent} 25%, transparent)` : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>
          {selected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: selected ? accent : 'rgba(255,255,255,0.4)', lineHeight: 1, letterSpacing: '0.04em' }}>{fmt(file.rowCount)}</div>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>LIGNES</div>
        </div>
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700, color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', lineHeight: 1.4, wordBreak: 'break-all' }}>
        {file.name}
      </div>
    </button>
  )
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 7, textTransform: 'uppercase' }}>{children}</div>
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 10px',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
  color: 'rgba(255,255,255,0.85)', outline: 'none', caretColor: '#fff',
}

function YearRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div>
      <FilterLabel>Année de naissance</FilterLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number" min={1900} max={2020} value={from} onChange={(e) => onFrom(e.target.value)}
          placeholder="1960"
          style={{ ...INPUT_STYLE, flex: 1, MozAppearance: 'textfield' } as React.CSSProperties}
        />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, flexShrink: 0, fontFamily: '"JetBrains Mono", monospace' }}>→</span>
        <input
          type="number" min={1900} max={2020} value={to} onChange={(e) => onTo(e.target.value)}
          placeholder="1990"
          style={{ ...INPUT_STYLE, flex: 1, MozAppearance: 'textfield' } as React.CSSProperties}
        />
      </div>
    </div>
  )
}

function BankPicker({ selected, onToggle, accent }: { selected: Set<string>; onToggle: (b: string) => void; accent: string }) {
  const [cat, setCat] = useState<'TRAD' | 'NEO'>('TRAD')
  const banks = cat === 'TRAD' ? BANKS_TRAD : BANKS_NEO

  return (
    <div>
      <FilterLabel>Banque {selected.size > 0 && <span style={{ color: accent, opacity: 0.8 }}>({selected.size} sélect.)</span>}</FilterLabel>

      {/* Toggle catégorie */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['TRAD', 'NEO'] as const).map((c) => {
          const active = cat === c
          const label = c === 'TRAD' ? 'TRADITIONNELLES' : 'NÉOBANQUES'
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              flex: 1, height: 30, borderRadius: 7, cursor: 'pointer',
              border: active ? `1px solid ${accent}80` : '1px solid rgba(255,255,255,0.1)',
              background: active ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'rgba(255,255,255,0.03)',
              color: active ? accent : 'rgba(255,255,255,0.35)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 700,
              letterSpacing: '0.1em', transition: 'all 0.15s',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {banks.map((bank) => {
          const active = selected.has(bank)
          return (
            <button key={bank} onClick={() => onToggle(bank)} style={{
              background: active ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'rgba(255,255,255,0.04)',
              border: active ? `1px solid ${accent}70` : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
              color: active ? accent : 'rgba(255,255,255,0.45)',
              letterSpacing: '0.06em', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              {bank}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GenderToggle({ value, onChange, accent }: { value: Gender; onChange: (v: Gender) => void; accent: string }) {
  const opts: { key: Gender; label: string }[] = [{ key: 'ALL', label: 'TOUS' }, { key: 'M', label: 'HOMME' }, { key: 'F', label: 'FEMME' }]
  return (
    <div>
      <FilterLabel>Sexe</FilterLabel>
      <div style={{ display: 'flex', gap: 6 }}>
        {opts.map((opt) => {
          const active = value === opt.key
          return (
            <button key={opt.key} onClick={() => onChange(opt.key)} style={{
              flex: 1, height: 34, borderRadius: 8, cursor: 'pointer',
              border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
              background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.03)',
              color: active ? accent : 'rgba(255,255,255,0.4)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              transition: 'all 0.15s',
            }}>{opt.label}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'fiche').toLowerCase()
  const { label, accent, glow } = TYPE_META[rawType] ?? TYPE_META.fiche
  const apiType = label

  useTelegramBackButton(() => navigate('/donnees'))

  // File selection
  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(new Set())
  // Filters
  const [yearFrom,      setYearFrom]      = useState('')
  const [yearTo,        setYearTo]        = useState('')
  const [deptRaw,       setDeptRaw]       = useState('')
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set())
  const [gender,        setGender]        = useState<Gender>('ALL')
  // Debounced query
  const [query, setQuery] = useState<Filters>({ fileIds: [], dobFrom: '', dobTo: '', departments: [], banks: [], gender: 'ALL' })

  const toggleBank = useCallback((bank: string) => {
    setSelectedBanks((prev) => { const n = new Set(prev); n.has(bank) ? n.delete(bank) : n.add(bank); return n })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery({
        fileIds: Array.from(selectedIds),
        // Convert year → full ISO date for backend comparison
        dobFrom: yearFrom ? `${yearFrom}-01-01` : '',
        dobTo:   yearTo   ? `${yearTo}-12-31`   : '',
        departments: parseTags(deptRaw),
        banks: Array.from(selectedBanks),
        gender,
      })
    }, 400)
    return () => clearTimeout(t)
  }, [selectedIds, yearFrom, yearTo, deptRaw, selectedBanks, gender])

  const { data: apiFiles, isLoading } = useQuery<DataFile[]>({
    queryKey: ['donnees-files', apiType],
    queryFn: () => api.get(`/api/donnees/files?type=${apiType}`).then((r) => r.data),
    staleTime: 60_000, retry: false,
  })

  const usingMock = !isLoading && (!apiFiles || apiFiles.length === 0)
  const files: DataFile[] = usingMock ? MOCK_FILES.filter((f) => f.type === apiType) : (apiFiles ?? [])

  const { data: apiCount, isFetching: countFetching } = useQuery<{ count: number }>({
    queryKey: ['donnees-count', query],
    queryFn: () => api.post('/api/donnees/count', query).then((r) => r.data),
    enabled: !usingMock && query.fileIds.length > 0,
    staleTime: 0,
  })

  const count = query.fileIds.length === 0 ? 0
    : usingMock
    ? calcMockCount(query.fileIds, { dobFrom: yearFrom, dobTo: yearTo, departments: parseTags(deptRaw), banks: Array.from(selectedBanks), gender })
    : (apiCount?.count ?? 0)

  const toggleFile = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAll = useCallback(() => {
    setSelectedIds(selectedIds.size === files.length ? new Set() : new Set(files.map((f) => f.id)))
  }, [selectedIds.size, files])

  const allSelected = files.length > 0 && selectedIds.size === files.length
  const hasFilters  = !!(yearFrom || yearTo || deptRaw || selectedBanks.size > 0 || gender !== 'ALL')

  const resetFilters = () => { setYearFrom(''); setYearTo(''); setDeptRaw(''); setSelectedBanks(new Set()); setGender('ALL') }

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${accent}26`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/donnees')} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: `1px solid ${accent}33`, background: `${accent}14`, color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>EXTRACTION</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, color: '#fff', letterSpacing: '0.06em', lineHeight: 1.1 }}>{label}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', padding: '3px 10px', borderRadius: 8, border: `1px solid ${query.fileIds.length > 0 ? accent+'50' : 'rgba(255,255,255,0.08)'}`, background: query.fileIds.length > 0 ? `${accent}14` : 'rgba(255,255,255,0.03)', transition: 'all 0.3s' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, color: query.fileIds.length > 0 ? accent : 'rgba(255,255,255,0.2)', lineHeight: 1, opacity: countFetching ? 0.5 : 1, transition: 'opacity 0.2s' }}>{fmt(count)}</div>
          <div style={{ fontSize: 6, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>LIGNES</div>
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 90 }}>

        {/* ── FILTRES ── */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>Filtres</div>
            {hasFilters && <button onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', padding: 0 }}>RÉINITIALISER</button>}
          </div>

          <YearRange from={yearFrom} to={yearTo} onFrom={setYearFrom} onTo={setYearTo} />

          <div>
            <FilterLabel>Département</FilterLabel>
            <input value={deptRaw} onChange={(e) => setDeptRaw(e.target.value)} placeholder="75, 69, 13… (séparer par virgule)" style={INPUT_STYLE} />
          </div>

          <BankPicker selected={selectedBanks} onToggle={toggleBank} accent={accent} />

          <GenderToggle value={gender} onChange={setGender} accent={accent} />
        </div>

        {/* ── FICHIERS ── */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              Fichiers {usingMock && <span style={{ color: 'rgba(255,255,255,0.12)' }}>(démo)</span>}
              {files.length > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 400, marginLeft: 6 }}>{selectedIds.size}/{files.length}</span>}
            </div>
            {files.length > 0 && (
              <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: allSelected ? accent : 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontWeight: 700 }}>
                {allSelected ? 'DÉSÉLECT.' : 'TOUT'}
              </button>
            )}
          </div>
          {isLoading ? (
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1,2,3,4].map((i) => <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          ) : (
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {files.map((file) => <FileCard key={file.id} file={file} selected={selectedIds.has(file.id)} onToggle={() => toggleFile(file.id)} accent={accent} />)}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #050505 75%, transparent)', padding: '14px 12px 22px' }}>
        <button
          disabled={query.fileIds.length === 0 || count === 0}
          style={{
            width: '100%', height: 48, borderRadius: 13,
            cursor: query.fileIds.length === 0 || count === 0 ? 'not-allowed' : 'pointer',
            border: `1px solid ${query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.08)'}`,
            background: query.fileIds.length > 0 && count > 0 ? `linear-gradient(135deg, ${glow}, color-mix(in srgb, ${accent} 10%, transparent))` : 'rgba(255,255,255,0.03)',
            color: query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.2)',
            fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, letterSpacing: '0.1em', transition: 'all 0.25s',
          }}
        >
          {query.fileIds.length === 0 ? 'SÉLECTIONNER DES FICHIERS' : count === 0 ? 'AUCUN RÉSULTAT' : `EXTRAIRE  ${fmt(count)}  LIGNE${count > 1 ? 'S' : ''}`}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}
