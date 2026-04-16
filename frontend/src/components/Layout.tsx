import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import CartIcon from './CartIcon'

export default function Layout() {
  useTheme()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
        color: 'var(--tg-theme-text-color, #000000)',
      }}
    >
      {!isAdmin && (
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderColor: 'var(--tg-theme-hint-color, #e5e7eb)',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)',
          }}
        >
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--tg-theme-text-color, #1f2937)' }}
          >
            🌸 FloraMini
          </h1>
          <CartIcon />
        </header>
      )}
      <main className="pb-24">
        <Outlet />
      </main>
    </div>
  )
}
