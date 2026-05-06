import { useEffect } from 'react'
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
  const restore = useAdminAuth((s) => s.restore)
  useEffect(() => { restore() }, [])
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
