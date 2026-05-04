import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

// ─── Format sheet ─────────────────────────────────────────────────────────────

interface FmtState { enabled: boolean; split: boolean; linesPerFile: string }
interface FormatSheetProps {
  count: number; accent: string; type: string
  onConfirm: (formats: { brut: boolean; specialTxt: boolean; specialXlsx: boolean }, splits: Record<string, number | null>) => void
  onClose: () => void
}

function FormatSheet({ count, accent, type, onConfirm, onClose }: FormatSheetProps) {
  const [brut,        setBrut]        = useState<FmtState>({ enabled: true,  split: false, linesPerFile: '' })
  const [specialTxt,  setSpecialTxt]  = useState<FmtState>({ enabled: false, split: false, linesPerFile: '' })
  const [specialXlsx, setSpecialXlsx] = useState<FmtState>({ enabled: false, split: false, linesPerFile: '' })

  const toggle = (setter: React.Dispatch<React.SetStateAction<FmtState>>, field: keyof FmtState) =>
    setter((p) => ({ ...p, [field]: !p[field] }))

  const numFiles = (s: FmtState) => {
    const n = parseInt(s.linesPerFile)
    if (!s.split || !n || n <= 0) return 1
    return Math.ceil(count / n)
  }

  const canConfirm = brut.enabled || specialTxt.enabled || specialXlsx.enabled

  const confirm = () => {
    const linesOrNull = (s: FmtState) => {
      if (!s.split) return null
      const n = parseInt(s.linesPerFile)
      return n > 0 && n < count ? n : null
    }
    onConfirm(
      { brut: brut.enabled, specialTxt: specialTxt.enabled, specialXlsx: specialXlsx.enabled },
      { brut: linesOrNull(brut), specialTxt: linesOrNull(specialTxt), specialXlsx: linesOrNull(specialXlsx) },
    )
  }

  const FormatRow = ({
    label, sub, state, setter, showSplit = true,
  }: {
    label: string; sub?: string; state: FmtState
    setter: React.Dispatch<React.SetStateAction<FmtState>>; showSplit?: boolean
  }) => (
    <div style={{ background: state.enabled ? `color-mix(in srgb, ${accent} 6%, #0d0d0d)` : '#0d0d0d', borderRadius: 12, border: `1px solid ${state.enabled ? accent + '30' : 'rgba(255,255,255,0.07)'}`, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.2s' }}>
      <button onClick={() => toggle(setter, 'enabled')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, color: state.enabled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{label}</div>
          {sub && <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: '0.08em' }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 22, borderRadius: 11, background: state.enabled ? accent : 'rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 3, left: state.enabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </div>
      </button>

      {state.enabled && showSplit && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 9 }}>
          <button onClick={() => toggle(setter, 'split')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${state.split ? accent : 'rgba(255,255,255,0.2)'}`, background: state.split ? `color-mix(in srgb, ${accent} 25%, transparent)` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              {state.split && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.7 4L6 1" stroke={accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: state.split ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>DÉCOUPER EN PLUSIEURS FICHIERS</span>
          </button>

          {state.split && (
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number" min={1} max={count - 1}
                value={state.linesPerFile}
                onChange={(e) => setter((p) => ({ ...p, linesPerFile: e.target.value }))}
                placeholder="250"
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'rgba(255,255,255,0.85)', outline: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>lignes/fichier</div>
              {state.linesPerFile && parseInt(state.linesPerFile) > 0 && (
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 15, color: accent, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>→ {numFiles(state)} fich.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0a0a0a', borderRadius: '20px 20px 0 0', padding: '0 0 32px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: '#fff', letterSpacing: '0.06em' }}>OPTIONS D'EXTRACTION</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{count.toLocaleString('fr-FR')} lignes • {type}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Formats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 2 }}>CHOISIR LES FORMATS (min. 1)</div>
          <FormatRow label="FICHIER BRUT (.txt)" sub="Colonnes séparées par virgule" state={brut} setter={setBrut} />
          <FormatRow label="SPÉCIAL TXT (emojis)" sub="Format formaté avec icônes" state={specialTxt} setter={setSpecialTxt} />
          <FormatRow label="SPÉCIAL XLSX (Excel)" sub="Colonnes NUMBER (+33) et NAME" state={specialXlsx} setter={setSpecialXlsx} showSplit />
        </div>

        {/* Confirm */}
        <div style={{ padding: '0 14px' }}>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            style={{
              width: '100%', height: 48, borderRadius: 13,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              border: `1px solid ${canConfirm ? accent : 'rgba(255,255,255,0.08)'}`,
              background: canConfirm ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.03)',
              color: canConfirm ? accent : 'rgba(255,255,255,0.2)',
              fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, letterSpacing: '0.1em', transition: 'all 0.2s',
            }}
          >
            CONFIRMER L'EXTRACTION
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DataType = 'FICHE' | 'NUMLIST' | 'MAILLIST'
type Gender   = 'ALL' | 'M' | 'F'

interface DataFile {
  id: number; name: string; uploadedAt: string; total: number; available: number
  hasNom: boolean; hasPrenom: boolean; hasNumero: boolean; hasDob: boolean
  hasAdresse: boolean; hasCodePostal: boolean; hasVille: boolean
  hasEmail: boolean; hasIban: boolean; hasBic: boolean
}

// ─── Banks ────────────────────────────────────────────────────────────────────

const BANKS_PHYSIQUE = [
  'BNP PARIBAS','CREDIT AGRICOLE','SOCIETE GENERALE','LCL','CIC','CREDIT MUTUEL',
  'LA BANQUE POSTALE','CAISSE EPARGNE','BANQUE POPULAIRE','BRED','HSBC FRANCE',
  'CREDIT DU NORD','PALATINE','AXA BANQUE','CETELEM','COFIDIS','SOFINCO','FRANFINANCE',
]
const BANKS_EN_LIGNE = [
  'BOURSORAMA','HELLO BANK','FORTUNEO','ING','MONABANQ','ORANGE BANK','MA FRENCH BANK',
  'FLOA BANK','REVOLUT','N26','NICKEL','QONTO','LYDIA','SUMERIA','SHINE','BUNQ',
  'WISE','PIXPAY','KARD','GREEN GOT','ANYTIME','VYBE','PAYSERA','MONESE',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: DataType; accent: string; glow: string }> = {
  fiche:    { label: 'FICHE',    accent: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
  numlist:  { label: 'NUMLIST',  accent: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
  maillist: { label: 'MAILLIST', accent: '#f472b6', glow: 'rgba(244,114,182,0.12)' },
}

function fmt(n: number) { return n.toLocaleString('fr-FR') }

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 7, textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 10px',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
  color: 'rgba(255,255,255,0.85)', outline: 'none', caretColor: '#fff',
}

function WarnBadge({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,180,0,0.7)', letterSpacing: '0.08em', marginTop: 5 }}>
      ⚠ {text}
    </div>
  )
}

function YearRange({ from, to, onFrom, onTo, warn }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; warn?: boolean }) {
  return (
    <div>
      <FilterLabel>Année de naissance</FilterLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="number" min={1900} max={2020} value={from} onChange={(e) => onFrom(e.target.value)}
          placeholder="1960" style={{ ...INPUT_STYLE, flex: 1, MozAppearance: 'textfield' } as React.CSSProperties} />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, flexShrink: 0, fontFamily: '"JetBrains Mono", monospace' }}>→</span>
        <input type="number" min={1900} max={2020} value={to} onChange={(e) => onTo(e.target.value)}
          placeholder="1990" style={{ ...INPUT_STYLE, flex: 1, MozAppearance: 'textfield' } as React.CSSProperties} />
      </div>
      {warn && <WarnBadge text="Certains fichiers sélectionnés n'ont pas de date de naissance" />}
    </div>
  )
}

function BankPicker({ selected, onToggle, accent, warn }: { selected: Set<string>; onToggle: (b: string) => void; accent: string; warn?: boolean }) {
  const [cat, setCat] = useState<'PHYSIQUE' | 'EN_LIGNE'>('PHYSIQUE')
  const banks = cat === 'PHYSIQUE' ? BANKS_PHYSIQUE : BANKS_EN_LIGNE

  return (
    <div>
      <FilterLabel>Banque {selected.size > 0 && <span style={{ color: accent, opacity: 0.8 }}>({selected.size} sélect.)</span>}</FilterLabel>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['PHYSIQUE', 'EN_LIGNE'] as const).map((c) => {
          const active = cat === c
          const lbl = c === 'PHYSIQUE' ? 'BANQUE PHYSIQUE' : 'EN LIGNE / NEO'
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              flex: 1, height: 30, borderRadius: 7, cursor: 'pointer',
              border: active ? `1px solid ${accent}80` : '1px solid rgba(255,255,255,0.1)',
              background: active ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'rgba(255,255,255,0.03)',
              color: active ? accent : 'rgba(255,255,255,0.35)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 700,
              letterSpacing: '0.1em', transition: 'all 0.15s',
            }}>{lbl}</button>
          )
        })}
      </div>
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
            }}>{bank}</button>
          )
        })}
      </div>
      {warn && <WarnBadge text="Certains fichiers sélectionnés n'ont pas de données bancaires" />}
    </div>
  )
}

function GenderToggle({ value, onChange, accent, warn }: { value: Gender; onChange: (v: Gender) => void; accent: string; warn?: boolean }) {
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
      {warn && <WarnBadge text="Certains fichiers sélectionnés n'ont pas de données de genre" />}
    </div>
  )
}

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
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: selected ? accent : 'rgba(255,255,255,0.4)', lineHeight: 1, letterSpacing: '0.04em' }}>{fmt(file.available)}</div>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>DISPO</div>
        </div>
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700, color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', lineHeight: 1.4, wordBreak: 'break-all' }}>
        {file.name}
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'fiche').toLowerCase()
  const { label: apiType, accent, glow } = TYPE_META[rawType] ?? TYPE_META.fiche

  useTelegramBackButton(() => navigate('/donnees'))

  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(new Set())
  const [yearFrom,      setYearFrom]      = useState('')
  const [yearTo,        setYearTo]        = useState('')
  const [deptRaw,       setDeptRaw]       = useState('')
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set())
  const [gender,        setGender]        = useState<Gender>('ALL')
  const [withNames,     setWithNames]     = useState(false)
  const [showFmtSheet,  setShowFmtSheet]  = useState(false)
  const [debouncedQ,    setDebouncedQ]    = useState({ fileIds: [] as number[], type: apiType, dobFrom: '', dobTo: '', departments: [] as string[], banks: [] as string[], gender: 'ALL' as Gender })

  const toggleBank = useCallback((bank: string) => {
    setSelectedBanks((prev) => { const n = new Set(prev); n.has(bank) ? n.delete(bank) : n.add(bank); return n })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ({
        fileIds: Array.from(selectedIds),
        type: apiType,
        dobFrom: yearFrom ? `${yearFrom}-01-01` : '',
        dobTo:   yearTo   ? `${yearTo}-12-31`   : '',
        departments: deptRaw.split(',').map((s) => s.trim()).filter(Boolean),
        banks: Array.from(selectedBanks),
        gender,
      })
    }, 400)
    return () => clearTimeout(t)
  }, [selectedIds, apiType, yearFrom, yearTo, deptRaw, selectedBanks, gender])

  const { data: files = [], isLoading } = useQuery<DataFile[]>({
    queryKey: ['donnees-files', apiType],
    queryFn: () => api.get(`/api/donnees/files?type=${apiType}`).then((r) => r.data),
    staleTime: 30_000, retry: false,
  })

  const { data: countData, isFetching: countFetching } = useQuery<{ count: number }>({
    queryKey: ['donnees-count', debouncedQ],
    queryFn: () => api.post('/api/donnees/count', debouncedQ).then((r) => r.data),
    enabled: debouncedQ.fileIds.length > 0,
    staleTime: 0,
  })

  const count = debouncedQ.fileIds.length === 0 ? 0 : (countData?.count ?? 0)

  // Detect which columns are available in selected files
  const selectedFiles = useMemo(() => files.filter((f) => selectedIds.has(f.id)), [files, selectedIds])
  const anySelected   = selectedFiles.length > 0

  const allHaveDob    = anySelected && selectedFiles.every((f) => f.hasDob)
  const anyMissingDob = anySelected && !allHaveDob && selectedFiles.some((f) => !f.hasDob)
  const allHaveBank   = anySelected && selectedFiles.every((f) => f.hasIban || f.hasBic)
  const anyMissingBank = anySelected && !allHaveBank
  const allHaveGender = anySelected && selectedFiles.every((f) => f.hasNom && f.hasPrenom)
  const anyMissingGender = anySelected && !allHaveGender
  const canHaveNames  = anySelected && selectedFiles.some((f) => f.hasNom && f.hasPrenom)

  const toggleFile = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAll = useCallback(() => {
    setSelectedIds(selectedIds.size === files.length ? new Set() : new Set(files.map((f) => f.id)))
  }, [selectedIds.size, files])
  const allSelected = files.length > 0 && selectedIds.size === files.length

  const hasFilters = !!(yearFrom || yearTo || deptRaw || selectedBanks.size > 0 || gender !== 'ALL')
  const resetFilters = () => { setYearFrom(''); setYearTo(''); setDeptRaw(''); setSelectedBanks(new Set()); setGender('ALL') }

  const extractMutation = useMutation({
    mutationFn: (opts: { formats: { brut: boolean; specialTxt: boolean; specialXlsx: boolean }; splits: Record<string, number | null> }) =>
      api.post('/api/data-orders/extract', {
        fileIds: Array.from(selectedIds), type: apiType,
        dobFrom: yearFrom ? `${yearFrom}-01-01` : undefined,
        dobTo:   yearTo   ? `${yearTo}-12-31`   : undefined,
        departments: deptRaw.split(',').map((s) => s.trim()).filter(Boolean),
        banks: Array.from(selectedBanks),
        gender: gender !== 'ALL' ? gender : undefined,
        withNames,
        formats: opts.formats,
        splits: {
          brut:        { linesPerFile: opts.splits.brut ?? null },
          specialTxt:  { linesPerFile: opts.splits.specialTxt ?? null },
          specialXlsx: { linesPerFile: opts.splits.specialXlsx ?? null },
        },
      }).then((r) => r.data),
    onSuccess: () => navigate('/mes-extractions'),
  })

  const canExtract = selectedIds.size > 0 && count > 0 && !extractMutation.isPending

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${accent}26`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/donnees')} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: `1px solid ${accent}33`, background: `${accent}14`, color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>EXTRACTION</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, color: '#fff', letterSpacing: '0.06em', lineHeight: 1.1 }}>{apiType}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', padding: '3px 10px', borderRadius: 8, border: `1px solid ${selectedIds.size > 0 ? accent+'50' : 'rgba(255,255,255,0.08)'}`, background: selectedIds.size > 0 ? `${accent}14` : 'rgba(255,255,255,0.03)', transition: 'all 0.3s' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, color: selectedIds.size > 0 ? accent : 'rgba(255,255,255,0.2)', lineHeight: 1, opacity: countFetching ? 0.5 : 1, transition: 'opacity 0.2s' }}>{fmt(count)}</div>
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

          <YearRange from={yearFrom} to={yearTo} onFrom={setYearFrom} onTo={setYearTo} warn={anyMissingDob && (!!yearFrom || !!yearTo)} />

          <div>
            <FilterLabel>Département</FilterLabel>
            <input value={deptRaw} onChange={(e) => setDeptRaw(e.target.value)} placeholder="75, 69, 13… (séparer par virgule)" style={INPUT_STYLE} />
          </div>

          <BankPicker selected={selectedBanks} onToggle={toggleBank} accent={accent} warn={anyMissingBank && selectedBanks.size > 0} />

          <GenderToggle value={gender} onChange={setGender} accent={accent} warn={anyMissingGender && gender !== 'ALL'} />
        </div>

        {/* ── OPTION NOM + PRÉNOM (NUMLIST / MAILLIST) ── */}
        {(apiType === 'NUMLIST' || apiType === 'MAILLIST') && (
          <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, border: `1px solid ${withNames && canHaveNames ? accent+'30' : 'rgba(255,255,255,0.07)'}`, padding: '12px 14px' }}>
            <button
              onClick={() => canHaveNames && setWithNames((v) => !v)}
              disabled={!canHaveNames}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', cursor: canHaveNames ? 'pointer' : 'not-allowed', padding: 0,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: canHaveNames ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                  INCLURE NOM + PRÉNOM
                </div>
                <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,180,0,0.6)', marginTop: 3, letterSpacing: '0.07em' }}>
                  {canHaveNames ? '+ Tarif supplémentaire appliqué' : 'Non disponible pour les fichiers sélectionnés'}
                </div>
              </div>
              <div style={{
                width: 40, height: 22, borderRadius: 11, transition: 'all 0.2s',
                background: withNames && canHaveNames ? accent : 'rgba(255,255,255,0.1)',
                position: 'relative', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: withNames && canHaveNames ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                }} />
              </div>
            </button>
          </div>
        )}

        {/* ── FICHIERS ── */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              Fichiers
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
          ) : files.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              Aucun fichier disponible pour ce type
            </div>
          ) : (
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {files.map((file) => (
                <FileCard key={file.id} file={file} selected={selectedIds.has(file.id)} onToggle={() => toggleFile(file.id)} accent={accent} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #050505 75%, transparent)', padding: '14px 12px 22px' }}>
        {extractMutation.isError && (
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#f87171', textAlign: 'center', marginBottom: 8 }}>
            Une erreur est survenue, réessayez
          </div>
        )}
        <button
          onClick={() => canExtract && setShowFmtSheet(true)}
          disabled={!canExtract}
          style={{
            width: '100%', height: 48, borderRadius: 13,
            cursor: canExtract ? 'pointer' : 'not-allowed',
            border: `1px solid ${canExtract ? accent : 'rgba(255,255,255,0.08)'}`,
            background: canExtract ? `linear-gradient(135deg, ${glow}, color-mix(in srgb, ${accent} 10%, transparent))` : 'rgba(255,255,255,0.03)',
            color: canExtract ? accent : 'rgba(255,255,255,0.2)',
            fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, letterSpacing: '0.1em', transition: 'all 0.25s',
          }}
        >
          {extractMutation.isPending
            ? 'EXTRACTION EN COURS…'
            : selectedIds.size === 0
            ? 'SÉLECTIONNER DES FICHIERS'
            : count === 0
            ? 'AUCUN RÉSULTAT'
            : `EXTRAIRE  ${fmt(count)}  LIGNE${count > 1 ? 'S' : ''}`}
        </button>
      </div>

      {/* Format Sheet */}
      {showFmtSheet && (
        <FormatSheet
          count={count}
          accent={accent}
          type={apiType}
          onClose={() => setShowFmtSheet(false)}
          onConfirm={(formats, splits) => {
            setShowFmtSheet(false)
            extractMutation.mutate({ formats, splits })
          }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}
