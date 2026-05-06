import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`

const navItems = [
  { path: '/', label: 'DASHBOARD', icon: '◈' },
  { path: '/users', label: 'UTILISATEURS', icon: '👤' },
  { path: '/admins', label: 'ADMINS', icon: '🛡' },
  { path: '/collabs', label: 'COLLABS', icon: '◉' },
]

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  const visibleNav = isSuperAdmin ? navItems : navItems.filter((n) => n.path !== '/admins')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', fontFamily: '"JetBrains Mono",monospace' }}>
      <style>{FONTS}</style>

      {/* Sidebar */}
      <aside style={{ width: 200, borderRight: '1px solid rgba(251,191,36,0.12)', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 20, letterSpacing: '0.1em', color: '#fbbf24' }}>PANEL ADMIN</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{user?.firstName ?? '—'}</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {visibleNav.map((item) => {
            const active = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
            return (
              <button key={item.path} onClick={() => navigate(item.path)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                background: active ? 'rgba(251,191,36,0.1)' : 'transparent',
                color: active ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: '"JetBrains Mono",monospace',
                borderLeft: active ? '2px solid #fbbf24' : '2px solid transparent',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)',
            background: 'rgba(255,100,100,0.06)', color: 'rgba(255,100,100,0.7)', cursor: 'pointer',
            fontSize: 10, letterSpacing: '0.1em', fontFamily: '"JetBrains Mono",monospace',
          }}>
            DÉCONNEXION
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <Outlet />
      </main>
    </div>
  )
}
