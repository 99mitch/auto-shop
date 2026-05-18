import { useLocation, useNavigate } from 'react-router-dom'
import { Home, CreditCard, Receipt, User } from 'lucide-react'

const TABS = [
  { label: 'ACCUEIL', icon: Home, path: '/' },
  { label: 'CARTES', icon: CreditCard, path: '/catalogue' },
  { label: 'ORDRES', icon: Receipt, path: '/orders' },
  { label: 'PROFIL', icon: User, path: '/profile' },
] as const

function isActive(tab: (typeof TABS)[number], pathname: string): boolean {
  switch (tab.path) {
    case '/':
      return pathname === '/'
    case '/catalogue':
      return pathname.startsWith('/catalogue') || pathname.startsWith('/product')
    case '/orders':
      return pathname.startsWith('/orders') || pathname.startsWith('/order')
    case '/profile':
      return pathname === '/profile' || pathname === '/balance'
    default:
      return false
  }
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/collab') ||
    pathname === '/checkout' ||
    pathname === '/cart'
  ) {
    return null
  }

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 100,
        backgroundColor: 'rgba(5,5,5,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(251,191,36,0.12)',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab, pathname)
        const Icon = tab.icon

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              position: 'relative',
            }}
          >
            {/* Active indicator bar */}
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 2,
                borderRadius: 1,
                backgroundColor: active ? '#FBBF24' : 'transparent',
                transition: 'background-color 0.2s',
              }}
            />

            <Icon
              size={20}
              style={{
                color: active ? '#FBBF24' : 'rgba(255,255,255,0.28)',
                transition: 'color 0.2s',
              }}
            />

            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: active ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.22)',
                transition: 'color 0.2s',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
