import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string

export default function Login() {
  const { login, token } = useAdminAuth()
  const navigate = useNavigate()
  const widgetRef = useRef<HTMLDivElement>(null)

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
        const msg = err?.response?.data?.error ?? 'Accès refusé'
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
      </div>
    </div>
  )
}
