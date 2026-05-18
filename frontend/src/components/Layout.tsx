import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Layout() {
  useTheme()
  const { pathname } = useLocation()
  const isDark = pathname === '/' || pathname.startsWith('/catalogue') || pathname.startsWith('/product') || pathname === '/profile' || pathname.startsWith('/collab') || pathname.startsWith('/admin')
  const noScroll = pathname === '/' || pathname.startsWith('/product') || pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/order') || pathname.startsWith('/collab') || pathname.startsWith('/admin') || pathname === '/profile' || pathname === '/balance'

  return (
    <div
      style={{
        backgroundColor: isDark ? '#050505' : 'var(--tg-theme-bg-color, #ffffff)',
        color: isDark ? '#ffffff' : 'var(--tg-theme-text-color, #000000)',
        ...(noScroll ? { height: '100vh', overflow: 'hidden' } : { minHeight: '100vh' }),
      }}
    >
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <main style={noScroll ? { height: '100%' } : { paddingBottom: '6rem' }}>
        <div key={pathname} style={{ animation: 'pageIn 0.25s ease-out' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
