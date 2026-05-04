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

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; accent: string; glow: string }> = {
  fiche:    { label: 'FICHE',    accent: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
  numlist:  { label: 'NUMLIST',  accent: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
  maillist: { label: 'MAILLIST', accent: '#f472b6', glow: 'rgba(244,114,182,0.12)' },
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function parseTags(raw: string): string[] {
  return raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FileRow({
  file, selected, onToggle, accent,
}: { file: DataFile; selected: boolean; onToggle: () => void; accent: string }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.15s',
        background: selected ? `color-mix(in srgb, ${accent} 6%, transparent)` : 'transparent',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: selected ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.2)',
        background: selected ? `color-mix(in srgb, ${accent} 20%, transparent)` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: selected ? '#fff' : 'rgba(255,255,255,0.75)',
          fontWeight: 700, letterSpacing: '0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.name}
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.05em',
        }}>
          {fmtDate(file.uploadedAt)}
        </div>
      </div>

      {/* Row count */}
      <div style={{
        flexShrink: 0, textAlign: 'right',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
        fontWeight: 700, color: selected ? accent : 'rgba(255,255,255,0.35)',
        letterSpacing: '0.04em',
      }}>
        {fmt(file.rowCount)}
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 400, letterSpacing: '0.1em' }}>
          LIGNES
        </div>
      </div>
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 14px 8px',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
      color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
      textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {children}
    </div>
  )
}

function FilterInput({
  label, value, onChange, placeholder, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
        marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 10px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, color: 'rgba(255,255,255,0.85)',
          outline: 'none', caretColor: '#fff',
          colorScheme: 'dark',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
    </div>
  )
}

function DateRangeFilter({
  label, from, to, onFrom, onTo,
}: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const inputStyle: React.CSSProperties = {
    flex: 1, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 10px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11, color: 'rgba(255,255,255,0.85)',
    outline: 'none', colorScheme: 'dark',
  }
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
        marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, flexShrink: 0 }}>→</span>
        <input type="date" value={to} onChange={(e) => onTo(e.target.value)} style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
      </div>
    </div>
  )
}

function TagsInput({
  label, raw, onChange, placeholder,
}: { label: string; raw: string; onChange: (v: string) => void; placeholder?: string }) {
  const tags = parseTags(raw)
  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter((t) => t !== tag).join(', '))
  }, [tags, onChange])

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
        marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {tags.map((tag) => (
            <span key={tag} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5, padding: '2px 8px',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {tag}
              <button
                onClick={() => removeTag(tag)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, lineHeight: 1, fontSize: 11 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={raw}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 10px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, color: 'rgba(255,255,255,0.85)',
          outline: 'none', caretColor: '#fff',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em' }}>
        Séparer par virgule
      </div>
    </div>
  )
}

function GenderToggle({ value, onChange, accent }: { value: Gender; onChange: (v: Gender) => void; accent: string }) {
  const opts: { key: Gender; label: string }[] = [
    { key: 'ALL', label: 'TOUS' },
    { key: 'M', label: 'HOMME' },
    { key: 'F', label: 'FEMME' },
  ]
  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
        marginBottom: 8, textTransform: 'uppercase',
      }}>
        Sexe
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {opts.map((opt) => {
          const active = value === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                flex: 1, height: 36, borderRadius: 8, cursor: 'pointer',
                border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.03)',
                color: active ? accent : 'rgba(255,255,255,0.4)',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                fontWeight: 700, letterSpacing: '0.1em',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'fiche').toLowerCase()
  const typeKey = rawType as keyof typeof TYPE_LABELS
  const { label, accent, glow } = TYPE_LABELS[typeKey] ?? TYPE_LABELS.fiche
  const apiType = label // already uppercase

  useTelegramBackButton(() => navigate('/donnees'))

  // ── File selection ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // ── Filters ──
  const [dobFrom, setDobFrom] = useState('')
  const [dobTo, setDobTo] = useState('')
  const [deptRaw, setDeptRaw] = useState('')
  const [bankRaw, setBankRaw] = useState('')
  const [gender, setGender] = useState<Gender>('ALL')

  // ── Debounced query payload ──
  const [query, setQuery] = useState<Filters>({ fileIds: [], dobFrom: '', dobTo: '', departments: [], banks: [], gender: 'ALL' })

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery({
        fileIds: Array.from(selectedIds),
        dobFrom,
        dobTo,
        departments: parseTags(deptRaw),
        banks: parseTags(bankRaw),
        gender,
      })
    }, 400)
    return () => clearTimeout(t)
  }, [selectedIds, dobFrom, dobTo, deptRaw, bankRaw, gender])

  // ── Fetch files ──
  const { data: files = [], isLoading: filesLoading } = useQuery<DataFile[]>({
    queryKey: ['donnees-files', apiType],
    queryFn: () => api.get(`/api/donnees/files?type=${apiType}`).then((r) => r.data),
    staleTime: 60_000,
  })

  // ── Live count ──
  const { data: countData, isFetching: countFetching } = useQuery<{ count: number }>({
    queryKey: ['donnees-count', query],
    queryFn: () => api.post('/api/donnees/count', query).then((r) => r.data),
    enabled: query.fileIds.length > 0,
    staleTime: 0,
  })

  const count = query.fileIds.length === 0 ? 0 : (countData?.count ?? 0)

  const toggleFile = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }, [selectedIds.size, files])

  const allSelected = files.length > 0 && selectedIds.size === files.length

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${accent}26`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/donnees')}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: `1px solid ${accent}33`,
            background: `${accent}14`,
            color: accent, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}
        >←</button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: 1 }}>
            EXTRACTION
          </div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: '#fff', letterSpacing: '0.06em' }}>
            {label}
          </div>
        </div>

        {/* Live count badge */}
        <div style={{
          flexShrink: 0, textAlign: 'right',
          padding: '4px 12px', borderRadius: 8,
          border: `1px solid ${accent}40`,
          background: query.fileIds.length > 0 ? `${accent}14` : 'rgba(255,255,255,0.04)',
          transition: 'all 0.3s',
        }}>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif', fontSize: 22,
            color: query.fileIds.length > 0 ? accent : 'rgba(255,255,255,0.2)',
            letterSpacing: '0.04em', lineHeight: 1,
            opacity: countFetching ? 0.5 : 1, transition: 'opacity 0.2s',
          }}>
            {fmt(count)}
          </div>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
            LIGNES
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* File selection block */}
        <div style={{ background: '#0d0d0d', margin: '12px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Section header with select-all */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              Choisir les fichiers
            </div>
            {files.length > 0 && (
              <button
                onClick={toggleAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                  color: allSelected ? accent : 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em', fontWeight: 700,
                }}
              >
                {allSelected ? 'DÉSÉLECT. TOUT' : 'TOUT SÉLECT.'}
              </button>
            )}
          </div>

          {filesLoading ? (
            <div style={{ padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '32px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                AUCUN FICHIER DISPONIBLE
              </div>
            </div>
          ) : (
            files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                selected={selectedIds.has(file.id)}
                onToggle={() => toggleFile(file.id)}
                accent={accent}
              />
            ))
          )}
        </div>

        {/* Filters block */}
        <div style={{ background: '#0d0d0d', margin: '10px 12px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionLabel>Filtres optionnels</SectionLabel>

          <DateRangeFilter
            label="Date de naissance"
            from={dobFrom} to={dobTo}
            onFrom={setDobFrom} onTo={setDobTo}
          />

          <TagsInput
            label="Département"
            raw={deptRaw}
            onChange={setDeptRaw}
            placeholder="75, 69, 13..."
          />

          <TagsInput
            label="Banque"
            raw={bankRaw}
            onChange={setBankRaw}
            placeholder="BNP, CREDIT AGRICOLE, LCLADV..."
          />

          <GenderToggle value={gender} onChange={setGender} accent={accent} />
        </div>

      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, #050505 70%, transparent)',
        padding: '16px 12px 24px',
      }}>
        <button
          disabled={query.fileIds.length === 0 || count === 0}
          style={{
            width: '100%', height: 50, borderRadius: 14, cursor: query.fileIds.length === 0 || count === 0 ? 'not-allowed' : 'pointer',
            border: `1px solid ${query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.1)'}`,
            background: query.fileIds.length > 0 && count > 0
              ? `linear-gradient(135deg, ${glow}, color-mix(in srgb, ${accent} 10%, transparent))`
              : 'rgba(255,255,255,0.03)',
            color: query.fileIds.length > 0 && count > 0 ? accent : 'rgba(255,255,255,0.2)',
            fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, letterSpacing: '0.1em',
            transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {query.fileIds.length === 0
            ? 'SÉLECTIONNER DES FICHIERS'
            : count === 0
            ? 'AUCUN RÉSULTAT'
            : `EXTRAIRE ${fmt(count)} LIGNE${count > 1 ? 'S' : ''}`}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.7 } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>
    </div>
  )
}
