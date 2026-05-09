import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string

export default function Login() {
  const { login, loginWithPassword, token } = useAdminAuth()
  const navigate = useNavigate()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (token) { navigate('/', { replace: true }); return }
  }, [token])

  useEffect(() => {
    if (!widgetRef.current) return

    // Expose global callback for Telegram widget
    ;(window as any).onTelegramAuth = async (user: Record<string, string>) => {
      try {
        await login(user)
        navigate('/', { replace: true })
      } catch (err: any) {
        console.error('[login] auth error', err?.response?.status, err?.response?.data)
        const msg = err?.response?.data?.error ?? `Erreur ${err?.response?.status ?? 'réseau'}`
        alert(msg)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    widgetRef.current.appendChild(script)

    return () => { delete (window as any).onTelegramAuth }
  }, [])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdLoading(true)
    try {
      await loginWithPassword(pwd)
      navigate('/', { replace: true })
    } catch (err: any) {
      setPwdError(err?.response?.data?.error ?? 'Erreur réseau')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', gap: 32 }}>
      <style>{FONTS}</style>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 42, letterSpacing: '0.12em', color: '#fbbf24', lineHeight: 1 }}>PANEL ADMIN</div>
        <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: 6 }}>ACCÈS RÉSERVÉ AUX ADMINISTRATEURS</div>
      </div>

      <div style={{
        background: '#111', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 16,
        padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, minWidth: 280,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: '"JetBrains Mono",monospace' }}>
          CONNECTEZ-VOUS VIA TELEGRAM
        </div>
        <div ref={widgetRef} />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', textAlign: 'center' }}>
          Seuls les administrateurs enregistrés ont accès
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

        <form onSubmit={handlePasswordLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: '"JetBrains Mono",monospace', textAlign: 'center' }}>
            OU PAR MOT DE PASSE
          </div>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            style={{
              background: '#0a0a0a', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8,
              color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontSize: 13,
              padding: '10px 14px', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          {pwdError && <div style={{ fontSize: 11, color: '#f87171', fontFamily: '"JetBrains Mono",monospace', textAlign: 'center' }}>{pwdError}</div>}
          <button
            type="submit"
            disabled={pwdLoading || !pwd}
            style={{
              background: pwdLoading || !pwd ? 'rgba(251,191,36,0.2)' : '#fbbf24',
              color: '#000', border: 'none', borderRadius: 8, padding: '10px 0',
              fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, fontSize: 12,
              letterSpacing: '0.1em', cursor: pwdLoading || !pwd ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {pwdLoading ? '...' : 'CONNEXION'}
          </button>
        </form>
      </div>
    </div>
  )
}
