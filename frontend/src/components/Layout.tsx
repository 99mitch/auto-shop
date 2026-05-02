import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import CartIcon from './CartIcon'

export default function Layout() {
  useTheme()
  const { pathname } = useLocation()
  const isCatalogue = pathname === '/catalogue'
  const isLanding = pathname === '/'

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: isLanding ? '#0f0f0f' : 'var(--tg-theme-bg-color, #ffffff)',
        color: 'var(--tg-theme-text-color, #000000)',
      }}
    >
      {isCatalogue && (
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
            backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <h1
              className="text-base font-bold tracking-tight"
              style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
            >
              Fullz
            </h1>
          </div>
          <CartIcon />
        </header>
      )}
      <main className="pb-24">
        <Outlet />
      </main>
    </div>
  )
}
