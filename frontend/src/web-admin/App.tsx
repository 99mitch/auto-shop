import { useEffect, useState } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminAuth } from './stores/auth'
import Guard from './components/Guard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Admins from './pages/Admins'
import Collabs from './pages/Collabs'
import CollabDetail from './pages/CollabDetail'

const qc = new QueryClient()

const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <Guard><Layout /></Guard>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'users', element: <Users /> },
      { path: 'admins', element: <Admins /> },
      { path: 'collabs', element: <Collabs /> },
      { path: 'collabs/:id', element: <CollabDetail /> },
    ],
  },
])

export default function AdminApp() {
  const { restore, loginWithInitData } = useAdminAuth()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initData = params.get('initData')

    if (initData) {
      // Clean the URL immediately so initData doesn't stay visible
      window.history.replaceState({}, '', window.location.pathname)
      loginWithInitData(initData)
        .catch(console.error)
        .finally(() => setBooting(false))
    } else {
      restore()
      setBooting(false)
    }
  }, [])

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050505' }}>
        <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(251,191,36,0.6)', letterSpacing: '0.15em' }}>
          CONNEXION...
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
