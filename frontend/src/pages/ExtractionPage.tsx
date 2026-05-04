import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type DataType = 'FICHE' | 'NUMLIST' | 'MAILLIST'
type Gender = 'ALL' | 'M' | 'F'

interface DataFile {
  id: number
  name: string
  type: DataType
  rowCount: number
  uploadedAt: string
}

interface Filters {
  fileIds: number[]
  dobFrom: string
  dobTo: string
  departments: string[]
  banks: string[]
  gender: Gender
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_FILES: DataFile[] = [
  { id: -1,  name: 'AMELI_FR_2024_Q1',       type: 'FICHE',    rowCount: 148, uploadedAt: '2024-01-15T10:00:00Z' },
  { id: -2,  name: 'AMELI_FR_2024_Q2',       type: 'FICHE',    rowCount: 163, uploadedAt: '2024-04-10T10:00:00Z' },
  { id: -3,  name: 'SFR_NATIONAL_2024',      type: 'FICHE',    rowCount: 112, uploadedAt: '2024-03-20T10:00:00Z' },
  { id: -4,  name: 'AMAZON_FR_2023',         type: 'FICHE',    rowCount: 197, uploadedAt: '2023-11-05T10:00:00Z' },
  { id: -5,  name: 'CPAM_IDF_2024',          type: 'FICHE',    rowCount: 134, uploadedAt: '2024-05-01T10:00:00Z' },
  { id: -6,  name: 'ORANGE_FR_2024',         type: 'FICHE',    rowCount:  98, uploadedAt: '2024-04-22T10:00:00Z' },
  { id: -7,  name: 'CELIO_2023',             type: 'FICHE',    rowCount:  76, uploadedAt: '2023-08-14T10:00:00Z' },
  { id: -8,  name: 'FNAC_FR_2024',           type: 'FICHE',    rowCount: 121, uploadedAt: '2024-04-28T10:00:00Z' },
  { id: -9,  name: 'IDF_2024_BATCH01',       type: 'NUMLIST',  rowCount: 243, uploadedAt: '2024-03-12T10:00:00Z' },
  { id: -10, name: 'SUD_2024_BATCH01',       type: 'NUMLIST',  rowCount: 187, uploadedAt: '2024-03-08T10:00:00Z' },
  { id: -11, name: 'ORANGE_FR_2024',         type: 'NUMLIST',  rowCount: 312, uploadedAt: '2024-04-02T10:00:00Z' },
  { id: -12, name: 'SFR_FR_2024',            type: 'NUMLIST',  rowCount: 276, uploadedAt: '2024-03-28T10:00:00Z' },
  { id: -13, name: 'NORD_2024',              type: 'NUMLIST',  rowCount: 159, uploadedAt: '2024-02-20T10:00:00Z' },
  { id: -14, name: 'FREE_MOBILE_2024',       type: 'NUMLIST',  rowCount: 228, uploadedAt: '2024-04-18T10:00:00Z' },
  { id: -15, name: 'GAMING_FR_2024',         type: 'MAILLIST', rowCount: 175, uploadedAt: '2024-02-28T10:00:00Z' },
  { id: -16, name: 'ECOMMERCE_FR_2024_Q1',   type: 'MAILLIST', rowCount: 234, uploadedAt: '2024-01-30T10:00:00Z' },
  { id: -17, name: 'ECOMMERCE_FR_2024_Q2',   type: 'MAILLIST', rowCount: 198, uploadedAt: '2024-04-25T10:00:00Z' },
  { id: -18, name: 'FORUM_FR_2023',          type: 'MAILLIST', rowCount: 143, uploadedAt: '2023-07-11T10:00:00Z' },
  { id: -19, name: 'STREAMING_FR_2024',      type: 'MAILLIST', rowCount: 267, uploadedAt: '2024-04-30T10:00:00Z' },
  { id: -20, name: 'RETAIL_FR_2024',         type: 'MAILLIST', rowCount: 156, uploadedAt: '2024-03-05T10:00:00Z' },
]

const _DEPTS = ['01','06','13','17','21','25','29','31','33','34','35','38','42','44','49','54','57','59','62','63','67','69','75','76','77','78','80','83','91','92','93','94','95']
const _BANKS = ['BNP PARIBAS','CREDIT AGRICOLE','SOCIETE GENERALE','LCLADV','CIC','CREDIT MUTUEL','LA BANQUE POSTALE','CAISSE EPARGNE','BANQUE POPULAIRE','HSBC','BRED','BOURSORAMA']

let _s = 9973
function _r(max: number) { _s = (_s * 1664525 + 1013904223) >>> 0; return _s % max }
interface MockRecord { fileId: number; gender: string; dob: string; department: string; bank: string }

const MOCK_RECORDS: MockRecord[] = (() => {
  const out: MockRecord[] = []
  for (const f of MOCK_FILES) {
    for (let i = 0; i < Math.min(f.rowCount, 80); i++) {
      const year = 1950 + _r(53)
      out.push({ fileId: f.id, gender: _r(2) === 0 ? 'M' : 'F', dob: `${year}-${String(1+_r(12)).padStart(2,'0')}-${String(1+_r(28)).padStart(2,'0')}`, department: _DEPTS[_r(_DEPTS.length)], bank: f.type === 'FICHE' ? _BANKS[_r(_BANKS.length)] : '' })
    }
  }
  return out
})()

function calcMockCount(fileIds: number[], f: Omit<Filters,'fileIds'>): number {
  return MOCK_RECORDS.filter((r) => {
    if (!fileIds.includes(r.fileId)) return false
    if (f.dobFrom && r.dob < f.dobFrom) return false
    if (f.dobTo   && r.dob > f.dobTo)   return false
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

// ─── File card (grille 2 colonnes) ───────────────────────────────────────────

function FileCard({ file, selected, onToggle, accent }: { file: DataFile; selected: boolean; onToggle: () => void; accent: string }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: selected ? `color-mix(in srgb, ${accent} 8%, #111)` : '#111',
        border: selected ? `1px solid ${accent}60` : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '10px 12px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'all 0.15s',
      }}
    >
      {/* Top row: checkbox + count */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        {/* Checkbox */}
        <div style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: selected ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.2)',
          background: selected ? `color-mix(in srgb, ${accent} 25%, transparent)` : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {selected && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        {/* Count */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: selected ? accent : 'rgba(255,255,255,0.4)', lineHeight: 1, letterSpacing: '0.04em' }}>
            {fmt(file.rowCount)}
          </div>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>LIGNES</div>
        </div>
      </div>
      {/* Filename */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
        letterSpacing: '0.04em', lineHeight: 1.4,
        wordBreak: 'break-all',
      }}>
        {file.name}
      </div>
    </button>
  )
}

// ─── Filtre — input stylisé ───────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 10px',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
  color: 'rgba(255,255,255,0.85)', outline: 'none', colorScheme: 'dark', caretColor: '#fff',
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6, textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function TagsInput({ label, raw, onChange, placeholder }: { label: string; raw: string; onChange: (v: string) => void; placeholder?: string }) {
  const tags = parseTags(raw)
  const removeTag = useCallback((tag: string) => {
    onChange(parseTags(raw).filter((t) => t !== tag).join(', '))
  }, [raw, onChange])
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {tags.map((tag) => (
            <span key={tag} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '2px 7px', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, lineHeight: 1, fontSize: 12 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input value={raw} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={INPUT_STYLE} />
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
            }}>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'fiche').toLowerCase()
  const { label, accent, glow } = TYPE_META[rawType] ?? TYPE_META.fiche
  const apiType = label

  useTelegramBackButton(() => navigate('/donnees'))

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [dobFrom, setDobFrom] = useState('')
  const [dobTo,   setDobTo]   = useState('')
  const [deptRaw, setDeptRaw] = useState('')
  const [bankRaw, setBankRaw] = useState('')
  const [gender,  setGender]  = useState<Gender>('ALL')
  const [query,   setQuery]   = useState<Filters>({ fileIds: [], dobFrom: '', dobTo: '', departments: [], banks: [], gender: 'ALL' })

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery({ fileIds: Array.from(selectedIds), dobFrom, dobTo, departments: parseTags(deptRaw), banks: parseTags(bankRaw), gender })
    }, 400)
    return () => clearTimeout(t)
  }, [selectedIds, dobFrom, dobTo, deptRaw, bankRaw, gender])

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

  const count = query.fileIds.length === 0 ? 0 : usingMock
    ? calcMockCount(query.fileIds, { dobFrom: query.dobFrom, dobTo: query.dobTo, departments: query.departments, banks: query.banks, gender: query.gender })
    : (apiCount?.count ?? 0)

  const toggleFile = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(selectedIds.size === files.length ? new Set() : new Set(files.map((f) => f.id)))
  }, [selectedIds.size, files])

  const allSelected = files.length > 0 && selectedIds.size === files.length
  const hasFilters = dobFrom || dobTo || deptRaw || bankRaw || gender !== 'ALL'

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${accent}26`, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={() => navigate('/donnees')} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: `1px solid ${accent}33`, background: `${accent}14`, color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>EXTRACTION</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, color: '#fff', letterSpacing: '0.06em', lineHeight: 1.1 }}>{label}</div>
        </div>
        {/* Live count badge */}
        <div style={{ flexShrink: 0, textAlign: 'right', padding: '3px 10px', borderRadius: 8, border: `1px solid ${query.fileIds.length > 0 ? accent + '50' : 'rgba(255,255,255,0.08)'}`, background: query.fileIds.length > 0 ? `${accent}14` : 'rgba(255,255,255,0.03)', transition: 'all 0.3s' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, color: query.fileIds.length > 0 ? accent : 'rgba(255,255,255,0.2)', lineHeight: 1, opacity: countFetching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {fmt(count)}
          </div>
          <div style={{ fontSize: 6, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>LIGNES</div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 90 }}>

        {/* ── FILTRES (en haut) ── */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Header filtres */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>Filtres</div>
            {hasFilters && (
              <button onClick={() => { setDobFrom(''); setDobTo(''); setDeptRaw(''); setBankRaw(''); setGender('ALL') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', padding: 0 }}>
                RÉINITIALISER
              </button>
            )}
          </div>

          {/* DOB range */}
          <div style={{ padding: '10px 14px 0' }}>
            <FilterLabel>Date de naissance</FilterLabel>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={dobFrom} onChange={(e) => setDobFrom(e.target.value)} style={{ ...INPUT_STYLE, flex: 1 }} placeholder="De" />
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, flexShrink: 0 }}>→</span>
              <input type="date" value={dobTo}   onChange={(e) => setDobTo(e.target.value)}   style={{ ...INPUT_STYLE, flex: 1 }} placeholder="À" />
            </div>
          </div>

          {/* Département + Banque côte à côte */}
          <div style={{ padding: '10px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FilterLabel>Département</FilterLabel>
              <input value={deptRaw} onChange={(e) => setDeptRaw(e.target.value)} placeholder="75, 69, 13…" style={INPUT_STYLE} />
            </div>
            <div>
              <FilterLabel>Banque</FilterLabel>
              <input value={bankRaw} onChange={(e) => setBankRaw(e.target.value)} placeholder="BNP, CIC…" style={INPUT_STYLE} />
            </div>
          </div>

          {/* Sexe */}
          <div style={{ padding: '10px 14px 14px' }}>
            <GenderToggle value={gender} onChange={setGender} accent={accent} />
          </div>
        </div>

        {/* ── FICHIERS (grille 2 colonnes) ── */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Header fichiers */}
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

          {/* Grille */}
          {isLoading ? (
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1,2,3,4].map((i) => <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
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

      {/* ── Footer sticky ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #050505 75%, transparent)', padding: '14px 12px 22px' }}>
        <button
          disabled={query.fileIds.length === 0 || count === 0}
          style={{
            width: '100%', height: 48, borderRadius: 13,
            cursor: query.fileIds.length === 0 || count === 0 ? 'not-allowed' : 'pointer',
            border: `1px solid ${query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.08)'}`,
            background: query.fileIds.length > 0 && count > 0 ? `linear-gradient(135deg, ${glow}, color-mix(in srgb, ${accent} 10%, transparent))` : 'rgba(255,255,255,0.03)',
            color: query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.2)',
            fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, letterSpacing: '0.1em',
            transition: 'all 0.25s',
          }}
        >
          {query.fileIds.length === 0 ? 'SÉLECTIONNER DES FICHIERS' : count === 0 ? 'AUCUN RÉSULTAT' : `EXTRAIRE  ${fmt(count)}  LIGNE${count > 1 ? 'S' : ''}`}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
