import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Layout() {
  useTheme()
  const { pathname } = useLocation()
  const isDark = pathname === '/' || pathname.startsWith('/catalogue') || pathname.startsWith('/product')

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: isDark ? '#050505' : 'var(--tg-theme-bg-color, #ffffff)',
        color: isDark ? '#ffffff' : 'var(--tg-theme-text-color, #000000)',
      }}
    >
      <main className="pb-24">
        <Outlet />
      </main>
    </div>
  )
}
